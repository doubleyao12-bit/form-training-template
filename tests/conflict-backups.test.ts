import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveConflict,clearConflictBackups,conflictBackupCount,CONFLICT_BACKUP_KEY} from '../src/conflict-backups';
const data=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
const entry={workoutRunId:'r',setId:'s',patch:{version:1,actualReps:5},timestamp:'synthetic'};
test('backup cleanup only removes current user backups, never pending drafts',()=>{data.clear();data.set('training-hub-pending-workout-v1','preserve');archiveConflict('a',entry,{version:2},'local');archiveConflict('b',entry,{version:3},'remote');assert.equal(conflictBackupCount('a'),1);clearConflictBackups('a');assert.equal(conflictBackupCount('a'),0);assert.equal(conflictBackupCount('b'),1);assert.equal(data.get('training-hub-pending-workout-v1'),'preserve');});
test('foreign-user backup and malformed archives fail closed',()=>{data.clear();assert.throws(()=>archiveConflict('a',{...entry,userId:'b'},{version:2},'local'));data.set(CONFLICT_BACKUP_KEY,'broken');assert.throws(()=>clearConflictBackups('a'));assert.equal(data.get(CONFLICT_BACKUP_KEY),'broken');});
