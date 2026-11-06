import type {PendingWorkoutWrite} from './pending-journal';
import type {WorkoutSetPatch} from './domain/training';
export const CONFLICT_BACKUP_KEY='training-hub-conflict-backup-v1';
interface Backup {userId:string;entry:PendingWorkoutWrite;remote:WorkoutSetPatch;choice:'local'|'remote';resolvedAt:string}
function read():Backup[]{
  const value:unknown=JSON.parse(localStorage.getItem(CONFLICT_BACKUP_KEY)??'[]');
  if(!Array.isArray(value)||value.some(item=>!item||typeof item.userId!=='string'))throw new Error('本机备份格式无法确认，原始内容已保留，请先核对。');
  return value;
}
export function archiveConflict(userId:string,entry:PendingWorkoutWrite,remote:WorkoutSetPatch,choice:'local'|'remote'){
  if(entry.userId && entry.userId!==userId)throw new Error('备份用户不一致。');
  localStorage.setItem(CONFLICT_BACKUP_KEY,JSON.stringify([...read(),{userId,entry,remote,choice,resolvedAt:new Date().toISOString()}]));
}
export function conflictBackupCount(userId:string){return read().filter(item=>item.userId===userId).length;}
export function clearConflictBackups(userId:string){localStorage.setItem(CONFLICT_BACKUP_KEY,JSON.stringify(read().filter(item=>item.userId!==userId)));}
