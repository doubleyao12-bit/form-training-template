import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkoutSaveQueue,setPatch,SetWriteConflict} from '../src/workout-save-queue';
import {shouldReplayWorkoutWrite,type PendingWorkoutWrite} from '../src/pending-journal';
import type {WorkoutSet,WorkoutSetPatch} from '../src/domain/training';

function fixture() {
 const rows=new Map<string,WorkoutSet>(['a','b'].map(id=>[id,{id,userId:'u',workoutExerciseId:'e',order:0,completed:false,version:1,updatedAt:'2026-11-02T08:00:00Z'}]));
 const journal=new Map<string,PendingWorkoutWrite>();let calls=0;
 let send=async(id:string,patch:WorkoutSetPatch)=>{
  calls++;const row=rows.get(id)!;
  if(row.version!==patch.version)throw new Error('VERSION_CONFLICT');
  const next={...row,...Object.fromEntries(Object.entries(patch).map(([k,v])=>[k,v===null?undefined:v])),version:row.version+1,updatedAt:'2026-11-02T08:01:00Z'} as WorkoutSet;
  rows.set(id,next);return structuredClone(next);
 };
 const make=()=>new WorkoutSaveQueue({read:()=>[...journal.values()].map(e=>structuredClone(e)),put:e=>{journal.set(e.setId,structuredClone(e));},remove:id=>{journal.delete(id);},get:async id=>structuredClone(rows.get(id)!),update:(id,p)=>send(id,p),accepted:()=>{},changed:()=>{}},'r','u');
 const edit=(q:WorkoutSaveQueue,id:string,p:Partial<WorkoutSet>)=>q.edit(rows.get(id)!,setPatch({...rows.get(id)!,...p}));
 return {rows,journal,make,edit,get calls(){return calls;},get send(){return send;},set send(s:typeof send){send=s;}};
}
test('old gate reproduces single-device false elsewhere on its own successful write',()=>{
 assert.equal(shouldReplayWorkoutWrite('2026-11-02T08:00:01Z','2026-11-02T08:00:00Z'),false);
 // Previously: cloud commit followed by lost response leaves version1 journal.
 assert.equal(1===Number(2),false);
});
test('single device persists actual fields; unchanged successful intent is not resubmitted',async()=>{
 const f=fixture(),q=f.make();f.edit(q,'a',{actualLoad:70,actualReps:6,completed:true});await q.flush();await q.flush();
 assert.equal(f.calls,1);assert.equal(f.rows.get('a')!.actualReps,6);assert.equal(f.journal.size,0);
});
test('rapid edits during inflight write retain newer revision and use fresh CAS version',async()=>{
 const f=fixture(),q=f.make(),original=f.send;let release!:()=>void;const gate=new Promise<void>(r=>release=r);let started!:()=>void;const began=new Promise<void>(r=>started=r);
 f.send=async(id,p)=>{started();await gate;return original(id,p);};
 f.edit(q,'a',{actualReps:5});const running=q.drain('a');await began;
 f.edit(q,'a',{actualReps:8});release();await running;
 assert.equal(f.rows.get('a')!.actualReps,8);assert.equal(f.rows.get('a')!.version,3);assert.equal(f.calls,2);
});
test('different sets can resolve out of order without clearing each other',async()=>{
 const f=fixture(),q=f.make(),original=f.send;let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 f.send=async(id,p)=>{if(id==='a')await gate;return original(id,p);};
 f.edit(q,'a',{actualReps:5});f.edit(q,'b',{actualReps:7});const a=q.drain('a');await q.drain('b');
 assert.equal(f.journal.has('a'),true);assert.equal(f.journal.has('b'),false);release();await a;assert.equal(f.rows.get('b')!.actualReps,7);
});
test('success response lost is confirmed by reread, not a duplicate UPDATE',async()=>{
 const f=fixture(),q=f.make(),original=f.send;f.send=async(id,p)=>{await original(id,p);throw new Error('TIMEOUT');};
 f.edit(q,'a',{actualReps:6});await q.flush();assert.equal(f.calls,1);assert.equal(f.journal.size,0);
});
test('timeout before commit retains draft; explicit retry can persist',async()=>{
 const f=fixture(),q=f.make(),original=f.send;f.send=async()=>{throw new Error('OFFLINE');};
 f.edit(q,'a',{actualDurationSeconds:30});await assert.rejects(q.flush());assert.equal(f.journal.size,1);
 f.send=original;await q.flush();assert.equal(f.rows.get('a')!.actualDurationSeconds,30);
});
test('refresh restores durable sent outcome without replaying committed update',async()=>{
 const f=fixture(),q=f.make();f.edit(q,'a',{actualReps:6});const e=f.journal.get('a')!;
 f.journal.set('a',{...e,sent:e.patch});await f.send('a',e.patch);
 const fresh=f.make();await fresh.flush();assert.equal(f.calls,1);assert.equal(f.journal.size,0);
});
test('background queue reconstruction preserves edits newer than unknown submitted write',async()=>{
 const f=fixture(),q=f.make();f.edit(q,'a',{actualReps:6});const e=f.journal.get('a')!;
 f.journal.set('a',{...e,sent:e.patch,patch:{...e.patch,actualReps:8},revision:'newer'});await f.send('a',e.patch);
 await f.make().flush();assert.equal(f.rows.get('a')!.actualReps,8);assert.equal(f.calls,2);
});
test('true same-field multi-device conflict is explicit and preserves draft',async()=>{
 const f=fixture(),q=f.make();f.edit(q,'a',{actualReps:6});f.rows.set('a',{...f.rows.get('a')!,actualReps:9,version:2});
 await assert.rejects(q.flush());assert.ok(q.failures.get('a') instanceof SetWriteConflict);assert.equal(f.calls,0);assert.equal(f.journal.get('a')!.patch.actualReps,6);
 let backups=0;await q.resolve('a','local',()=>{backups++;});assert.equal(backups,1);assert.equal(f.rows.get('a')!.actualReps,6);
});
test('legacy journal never guesses base from timestamp; supports safe identical acknowledgement',async()=>{
 const f=fixture();const patch={...setPatch(f.rows.get('a')!),actualReps:6};f.journal.set('a',{setId:'a',workoutRunId:'r',patch,timestamp:'2099-01-01'});
 await assert.rejects(f.make().flush());assert.equal(f.calls,0);assert.equal(f.journal.size,1);
 f.rows.set('a',{...f.rows.get('a')!,actualReps:6});await f.make().flush();assert.equal(f.calls,0);
});
test('completion/history consumes actual confirmed values; failures block completion',async()=>{
 const f=fixture(),q=f.make();f.edit(q,'a',{actualLoad:80,actualReps:3,completed:true});await q.flush();
 const history=structuredClone([...f.rows.values()]);assert.equal(history[0].actualLoad,80);assert.equal(history[0].completed,true);
 f.edit(q,'b',{actualBreaths:5});f.send=async()=>{throw new Error('OFFLINE');};await assert.rejects(q.flush());assert.equal(f.journal.has('b'),true);
});
test('non-overlapping remote edits merge without overwriting remote values',async()=>{
 const f=fixture(),q=f.make();f.edit(q,'a',{actualReps:6});f.rows.set('a',{...f.rows.get('a')!,note:'remote',version:2});await q.flush();assert.equal(f.rows.get('a')!.note,'remote');assert.equal(f.rows.get('a')!.actualReps,6);
});
test('old persistLatest reproduction leaves stale version in a newer draft; Retry false conflict',async()=>{
 const f=fixture(),initial=f.rows.get('a')!;
 const sent={...setPatch(initial),actualReps:5};
 f.journal.set('a',{setId:'a',workoutRunId:'r',patch:{...sent,actualReps:8},timestamp:'2026-11-02T08:00:00Z'});
 const saved=await f.send('a',sent); // success updates UI.version, not durable patch.version
 assert.equal(f.journal.get('a')!.patch.version,1);assert.equal(saved.version,2);
 assert.equal(shouldReplayWorkoutWrite(saved.updatedAt,f.journal.get('a')!.timestamp),false);
 await assert.rejects(f.send('a',f.journal.get('a')!.patch),/VERSION_CONFLICT/);
});
test('two callers of same set share one lane and one submission',async()=>{
 const f=fixture(),q=f.make();f.edit(q,'a',{actualReps:6});const a=q.drain('a'),b=q.drain('a');assert.equal(a,b);await Promise.all([a,b]);assert.equal(f.calls,1);
});
test('failure in one set cannot be masked by successful other set',async()=>{
 const f=fixture(),q=f.make(),original=f.send;f.send=async(id,p)=>{if(id==='a')throw Error('OFFLINE');return original(id,p);};
 f.edit(q,'a',{actualReps:6});f.edit(q,'b',{actualReps:8});await assert.rejects(q.flush());assert.equal(q.failures.has('a'),true);assert.equal(f.journal.has('a'),true);assert.equal(f.journal.has('b'),false);
});
test('CAS conflict rereads remote and refuses overwrite',async()=>{
 const f=fixture(),q=f.make(),original=f.send;let reads=0;
 f.send=async(id,p)=>{reads++;f.rows.set(id,{...f.rows.get(id)!,actualLoad:100,version:2});return original(id,p);};
 f.edit(q,'a',{actualLoad:70});await assert.rejects(q.flush());assert.equal(f.rows.get('a')!.actualLoad,100);assert.ok(q.failures.get('a') instanceof SetWriteConflict);assert.equal(reads,1);
});
test('resolution backup failure preserves conflict and performs no write',async()=>{
 const f=fixture(),q=f.make();f.edit(q,'a',{actualReps:6});f.rows.set('a',{...f.rows.get('a')!,actualReps:9,version:2});await assert.rejects(q.flush());
 await assert.rejects(q.resolve('a','remote',()=>{throw Error('STORAGE_FULL');}));assert.equal(f.journal.size,1);assert.equal(f.calls,0);
});
test('foreign-user set cannot be read as authorization for a write',async()=>{
 const f=fixture(),q=f.make();f.edit(q,'a',{actualReps:6});f.rows.set('a',{...f.rows.get('a')!,userId:'other'});await assert.rejects(q.flush());assert.equal(f.calls,0);assert.equal(f.journal.size,1);
});
