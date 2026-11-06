import type { WorkoutSet, WorkoutSetPatch } from './domain/training';
import type { PendingWorkoutWrite } from './pending-journal';

export const writeFields = ['actualLoad','actualReps','actualDurationSeconds','actualBreaths','actualRPE','actualRIR','completed','note','measurementSnapshot'] as const;
export function setPatch(set: WorkoutSet): WorkoutSetPatch {
  return { version: set.version, ...Object.fromEntries(writeFields.map(key => [key,set[key] ?? null])) } as WorkoutSetPatch;
}
function equal(a: unknown,b: unknown) { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); }
export function equalWrite(a: WorkoutSetPatch,b: WorkoutSetPatch) { return writeFields.every(key=>equal(a[key],b[key])); }
export class SetWriteConflict extends Error {
  constructor(public setId: string,public local: WorkoutSetPatch,public remote: WorkoutSetPatch) { super('这组本地草稿与云端存在差异，已保留两份内容；请逐项核对后选择。'); }
}
interface Port {
  read(): PendingWorkoutWrite[];
  put(entry: PendingWorkoutWrite): void;
  remove(id: string): void;
  get(id: string): Promise<WorkoutSet>;
  update(id: string,patch: WorkoutSetPatch): Promise<WorkoutSet>;
  accepted(id: string,set: WorkoutSet): void;
  changed(): void;
}
/** Per-set serial queue. Durable base/intent/sent precede any network mutation.
 * Unknown outcomes are reconciled by remote values, never wall-clock ordering.
 * Failures stop the lane until explicit retry. Legacy drafts have no invented base.
 */
export class WorkoutSaveQueue {
  readonly running = new Map<string,Promise<void>>();
  readonly failures = new Map<string,Error>();
  constructor(private port: Port,readonly runId: string,readonly userId: string) {}
  entries() { return this.port.read().filter(e=>e.workoutRunId===this.runId && (!e.userId || e.userId===this.userId)); }
  private entry(id: string) { return this.entries().find(e=>e.setId===id); }
  edit(set: WorkoutSet,patch: WorkoutSetPatch) {
    const old=this.entry(set.id);
    this.port.put({workoutRunId:this.runId,userId:this.userId,setId:set.id,
      patch,base:old ? old.base : setPatch(set),sent:old?.sent,
      revision:crypto.randomUUID(),timestamp:new Date().toISOString()});
    this.port.changed();
  }
  /** Cooperative same-origin tabs hold a Web Lock across the complete drain. */
  drain(id: string): Promise<void> {
    const existing=this.running.get(id);if(existing)return existing;
    const task=Promise.resolve().then(async()=>{
      if(typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request(`form-save:${this.userId}:${id}`,async()=>{await this.process(id);});
      else await this.process(id);
    }).catch(error=>{
      this.failures.set(id,error instanceof Error?error:new Error(String(error)));throw error;
    }).finally(()=>{this.running.delete(id);this.port.changed();});
    this.running.set(id,task);this.port.changed();return task;
  }
  private async process(id: string) {
    this.failures.delete(id);
    while(this.entry(id)) {
      const remote=await this.port.get(id);
      if(remote.userId!==this.userId)throw new Error('训练组归属不一致，禁止保存。');
      const e=this.entry(id);if(!e)return;
      const cloud=setPatch(remote);
      if(equalWrite(e.patch,cloud)) { this.ack(e,remote);continue; }
      // A previously submitted write may have committed with its response lost.
      const base=e.sent && equalWrite(e.sent,cloud) ? cloud : e.base;
      if(!base)throw new SetWriteConflict(id,e.patch,cloud);
      const merged={...cloud};
      for(const key of writeFields) {
        const localChanged=!equal(e.patch[key],base[key]);
        const remoteChanged=!equal(cloud[key],base[key]);
        if(localChanged && remoteChanged && !equal(e.patch[key],cloud[key]))throw new SetWriteConflict(id,e.patch,cloud);
        if(localChanged)Object.assign(merged,{[key]:e.patch[key]});
      }
      // Persist intent + exact submitted payload before CAS. No timeout retry here.
      const sent={...merged,version:remote.version};
      this.port.put({...e,sent});
      let saved: WorkoutSet;
      try { saved=await this.port.update(id,sent); }
      catch(error) {
        // Re-read after conflict/timeout; keep draft on read failure or ambiguous result.
        const observed=await this.port.get(id).catch(()=>null);
        if(observed && observed.userId===this.userId && equalWrite(setPatch(observed),sent))saved=observed;
        else if(observed && observed.version!==remote.version)throw new SetWriteConflict(id,this.entry(id)?.patch ?? e.patch,setPatch(observed));
        else throw error;
      }
      this.ack(e,saved);
    }
  }
  private ack(sentEntry: PendingWorkoutWrite,saved: WorkoutSet) {
    const latest=this.entry(saved.id);
    if(!latest)return;
    if(latest.revision===sentEntry.revision) {
      this.port.remove(saved.id);this.port.accepted(saved.id,saved);
    } else {
      // Rebase edits made while the request was in flight without losing them.
      const patch={...setPatch(saved)};
      for(const key of writeFields)if(!equal(latest.patch[key],sentEntry.patch[key]))Object.assign(patch,{[key]:latest.patch[key]});
      this.port.put({...latest,base:setPatch(saved),patch,sent:undefined});
      this.port.accepted(saved.id,{...saved,...Object.fromEntries(Object.entries(patch).map(([k,v])=>[k,v===null?undefined:v]))});
    }
    this.port.changed();
  }
  async flush() {
    const outcomes=await Promise.allSettled(this.entries().map(e=>this.drain(e.setId)));
    if(outcomes.some(r=>r.status==='rejected') || this.entries().length || this.failures.size)throw new Error('仍有训练草稿未确认云端成功，请重试或核对冲突。');
  }
  async resolve(id: string, choice: 'local' | 'remote', archive: (entry: PendingWorkoutWrite,remote: WorkoutSetPatch)=>void) {
    if(this.running.has(id))throw new Error('请等待当前保存结束。');
    const conflict=this.failures.get(id),entry=this.entry(id);
    if(!(conflict instanceof SetWriteConflict) || !entry)throw new Error('请重新读取冲突。');
    const remote=await this.port.get(id),base=setPatch(remote);
    if(remote.userId!==this.userId || remote.version!==conflict.remote.version || !equalWrite(base,conflict.remote))throw new Error('云端再次变化，请先重试以重新核对。');
    archive(entry,base); // Backup must succeed before any explicit resolution.
    this.port.put({...entry,base,patch:choice==='local'?entry.patch:base,sent:undefined,revision:crypto.randomUUID()});
    this.failures.delete(id);this.port.changed();
    await this.drain(id);
  }
}
