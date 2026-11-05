import {aggregatePerformance,estimateOneRM,filterPoints,latestPerformanceSession,recordedTrend,type PerformanceEvidence} from '../src/performance-profile';
import {SupabaseHistoryRepository} from '../src/data/supabase/history-repository';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {WorkoutSet} from '../src/domain/training';
const assert=(condition:unknown,message:string)=>{if(!condition)throw Error(message);};
export const fixtureSet=(id:string,patch:Partial<WorkoutSet>={}):WorkoutSet=>({id,userId:'fixture',workoutExerciseId:'exercise',order:0,completed:true,version:1,updatedAt:'2026-09-18',actualLoad:100,actualReps:5,...patch});
export const fixtureEvidence=(id:string,sets:WorkoutSet[],patch:Partial<PerformanceEvidence>={}):PerformanceEvidence=>({runId:id,completedAt:'2026-09-12T12:00:00Z',sessionName:'深蹲主导',variationId:'back-squat--legacy-default',preparation:false,sets,...patch});
async function main(){
assert(Math.abs(estimateOneRM(100,5)!-116.6666667)<.0001,'Epley');
assert(estimateOneRM(100,1)===100,'single');
for(const reps of [0,13,50,1.5,NaN])assert(estimateOneRM(100,reps)===undefined,'invalid/high reps');
assert(estimateOneRM(0,5)===undefined&&estimateOneRM(undefined,5)===undefined,'missing load');
const legacy=fixtureSet('legacy');const original=JSON.stringify(legacy);
const strength=aggregatePerformance([fixtureEvidence('one',[legacy,fixtureSet('incomplete',{completed:false,actualLoad:200}),fixtureSet('high',{actualReps:30})]),fixtureEvidence('warm',[fixtureSet('warm',{actualLoad:300})],{preparation:true}),fixtureEvidence('one',[fixtureSet('second',{actualLoad:105})])],'externalLoad')[0];
assert(strength.sessions.length===1&&strength.points.length===1,'deduplicate session');
assert(strength.points[0].set.actualLoad===105,'representative best valid completed set');
assert(strength.records.length===3,'strength PRs');
assert(recordedTrend(strength).points[0].value===105&&recordedTrend(strength).kind==='load','actual weight chart, not estimated 1RM');
assert(JSON.stringify(legacy)===original&&!legacy.measurementSnapshot&&!legacy.actualDurationSeconds,'legacy unchanged, no inference');
const body=aggregatePerformance([fixtureEvidence('bw',[fixtureSet('bw',{actualLoad:0,actualReps:8}),fixtureSet('weighted',{actualLoad:10,actualReps:6}),fixtureSet('weighted20',{actualLoad:20,actualReps:5})])],'bodyweight');
assert(body.length===3&&body.every(m=>m.kind==='reps'),'bodyweight/weighted context separation, no added-load e1RM');
const assisted=aggregatePerformance([fixtureEvidence('as',[fixtureSet('a',{actualLoad:20}),fixtureSet('b',{actualLoad:30})])],'assistedBodyweight');assert(assisted.length===2,'assistance contexts');
const mixed=aggregatePerformance([fixtureEvidence('mix',[fixtureSet('reps',{actualLoad:0,actualReps:8,measurementSnapshot:{version:1,types:['reps'],trackLoad:false}}),fixtureSet('sec',{actualLoad:undefined,actualReps:undefined,actualDurationSeconds:30,measurementSnapshot:{version:1,types:['duration'],trackLoad:false,side:'eachSide'}}),fixtureSet('breaths',{actualLoad:undefined,actualReps:undefined,actualBreaths:5,measurementSnapshot:{version:1,types:['breaths'],trackLoad:false}})])],'externalLoad');
assert(mixed.length===3,'measurement axes separate');
assert(latestPerformanceSession(mixed)!.sets.length===3,'latest instance includes all recorded modes, not one representative set');
assert(latestPerformanceSession([])===undefined,'no invented latest session');
assert(mixed.find(m=>m.kind==='duration')!.records[0].value===30,'duration PR');
assert(mixed.find(m=>m.kind==='breaths')!.records.length===0&&mixed.find(m=>m.kind==='breaths')!.points[0].value===1,'breaths frequency, no PR');
const weightedHolds=aggregatePerformance([fixtureEvidence('hold',[fixtureSet('h10',{actualLoad:10,actualDurationSeconds:30,measurementSnapshot:{version:1,types:['duration'],trackLoad:true}}),fixtureSet('h20',{actualLoad:20,actualDurationSeconds:30,measurementSnapshot:{version:1,types:['duration'],trackLoad:true}})])],'externalLoad');assert(weightedHolds.length===2,'loaded durations remain context-compatible');
assert(aggregatePerformance([],'externalLoad').length===0,'empty');
const points=[{...strength.points[0],date:'2026-07-01T00:00:00Z'},{...strength.points[0],date:'2026-09-12T00:00:00Z'},{...strength.points[0],date:'2027-01-01T00:00:00Z'}];const now=new Date('2026-09-18T00:00:00Z');
assert(filterPoints(points,'4W',now).length===1&&filterPoints(points,'8W',now).length===1&&filterPoints(points,'6M',now).length===2&&filterPoints(points,'ALL',now).length===2,'window/future filtering');
// Read-only transport contract: one joined page for small history, no per-run/set requests.
const requests:Array<{table:string;operations:Array<[string,...unknown[]]>}>=[];
let authCount=0;
const row=(id:string)=>({id,actual_variation_id:null,selected_variation_id:'back-squat--legacy-default',intent_snapshot:{},workout_runs:{id,status:'completed',completed_at:'2026-09-12',reverted_at:null,session_snapshot:{name:'Squat'}},workout_sets:[{id:'set-'+id,user_id:'fixture',workout_exercise_id:id,order_index:0,completed:true,actual_load:100,actual_reps:5,version:1}]});
let pages=[Array.from({length:100},(_,i)=>row('run-'+i)),[row('last')]];
const client={auth:{getUser:async()=>{authCount++;return {data:{user:{id:'fixture'}},error:null};}},from:(table:string)=>{const request={table,operations:[] as Array<[string,...unknown[]]>};requests.push(request);const chain:Record<string,unknown>={};for(const method of ['select','eq','is','or','order','range'])chain[method]=(...args:unknown[])=>{request.operations.push([method,...args]);return chain;};chain.then=(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:pages.shift()??[],error:null}).then(resolve);return chain;}} as unknown as SupabaseClient;
const repository=new SupabaseHistoryRepository(client);const evidence=await repository.listPerformanceEvidence('back-squat--legacy-default');
assert(evidence.length===101&&requests.length===2&&authCount===1,'batched pagination, no N+1');
for(const request of requests){assert(request.table==='workout_exercises','variation-scoped table');assert(request.operations.some(op=>op[0]==='is'&&op[1]==='workout_runs.reverted_at'&&op[2]===null),'exclude reverted');assert(request.operations.some(op=>op[0]==='eq'&&op[1]==='workout_runs.status'&&op[2]==='completed'),'completed only');assert(request.operations.some(op=>op[0]==='eq'&&op[1]==='user_id'&&op[2]==='fixture'),'owner filter');assert(request.operations.some(op=>op[0]==='or'&&String(op[1]).includes('actual_variation_id.is.null')),'actual identity fallback only for legacy');}
pages=[[row('single')]];requests.length=0;await repository.listPerformanceEvidence('back-squat--legacy-default');assert(requests.length===1,'small history one data request');
let rejected=false;try{await repository.listPerformanceEvidence('invalid,filter');}catch{rejected=true;}assert(rejected,'filter injection rejected');
console.log('Performance aggregation, Epley, contexts, PR, legacy immutability, windows, empty and query pagination contracts passed.');
}
void main();
