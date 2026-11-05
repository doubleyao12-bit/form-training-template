import { useEffect, useRef, useState } from "react";
import type { ReplacementReason, WorkoutExercise, WorkoutRunAggregate, WorkoutSet, WorkoutSetPatch } from "./domain/training";
import { canFinishWorkout, nextPendingExercise } from "./core-loop";
import { getTrainingRepositories } from "./data/supabase/repositories";
import { journalWorkoutWrite, readPendingWorkoutWrites, removeWorkoutWrite, shouldReplayWorkoutWrite } from "./pending-journal";
import { rankSubstitutions } from "./substitution";
import { getVariationDisplay, getVariationMetadata, withCurrentExerciseDisplays } from "./exercise-display";
import { formatPerformance, loadInputCopy } from "./load-tracking";
import { formatMeasuredPerformance, repsMeasurement } from "./measurement";
import { ExercisePicker } from "./ExercisePicker";
import {ExerciseOrder} from './ExerciseOrder';
import {modeLabels,selectMeasurement} from './measurement-modes';
import {AddWorkoutAction,RemoveWorkoutAction} from './WorkoutActions';

import { aggregateSaveState, type SaveState } from "./save-state";
type SetValues = Omit<WorkoutSetPatch, "version">;
const repos = () => getTrainingRepositories();

export default function WorkoutScreen({ run: initialRun, onExit }: { run: WorkoutRunAggregate; onExit: () => Promise<void> }) {
  const [run, setRun] = useState(()=>withCurrentExerciseDisplays(initialRun));
  const [saveState, setSaveState] = useState<SaveState>("Saved");
  const [error, setError] = useState("");
  const [replaying, setReplaying] = useState(false);
  const [replacing, setReplacing] = useState<WorkoutExercise | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addingAction,setAddingAction]=useState(false),[removingAction,setRemovingAction]=useState<WorkoutExercise|null>(null);
  const runRef = useRef(run);
  const timers = useRef(new Map<string, number>());
  const inFlight = useRef(new Map<string, Promise<void>>());
  const saveFailed = useRef(false);
  const failedSets = useRef(new Set<string>());
  const operationRetry = useRef<(() => Promise<void>) | null>(null);
  const initialReplayStarted = useRef(false);
  function syncSaveState() {
    const pending = readPendingWorkoutWrites().some(item => item.workoutRunId === runRef.current.id);
    setSaveState(aggregateSaveState(inFlight.current.size + timers.current.size + Number(pending), failedSets.current.size, Boolean(operationRetry.current) || saveFailed.current));
  }

  const replaceRun = (next: WorkoutRunAggregate) => { const displayed=withCurrentExerciseDisplays(next);runRef.current = displayed; setRun(displayed); };
  const reload = async () => { const next = await repos().workouts.getActiveRun(); if (next) replaceRun(next); return next; };

  useEffect(() => {
    if (!initialReplayStarted.current) {
      initialReplayStarted.current = true;
      void replayJournal();
    }
    return () => { for (const timer of timers.current.values()) window.clearTimeout(timer); };
  }, []);

  function updateLocalSet(setId: string, values: SetValues) {
    const next = mapSet(runRef.current, setId, set => ({ ...set, ...localValues(values) }));
    replaceRun(next);
    const set = findSet(next, setId);
    if (!set) return;
    journalWorkoutWrite({ workoutRunId: next.id, setId, patch: toPatch(set), timestamp: new Date().toISOString() });
  }

  function queueSet(setId: string, values: SetValues, immediate = false) {
    // Completion only fills defaults for the active semantics, never invents inactive values.
    if(values.completed){const set=findSet(runRef.current,setId);const m=set?.measurementSnapshot??repsMeasurement;
      if(!m.trackLoad)delete values.actualLoad;
      if(!m.types.includes('reps'))delete values.actualReps;
      if(!m.types.includes('duration'))delete values.actualDurationSeconds;
      if(!m.types.includes('breaths'))delete values.actualBreaths;
    }
    updateLocalSet(setId, values);
    const priorTimer = timers.current.get(setId);
    if (priorTimer) window.clearTimeout(priorTimer);
    timers.current.set(setId, window.setTimeout(() => { timers.current.delete(setId); void persistLatest(setId); }, immediate ? 0 : 420));
    syncSaveState();
  }

  async function persistLatest(setId: string) {
    const prior = inFlight.current.get(setId) ?? Promise.resolve();
    const task = prior.catch(() => undefined).then(async () => {
      const current = findSet(runRef.current, setId);
      if (!current) return;
      const sent = toPatch(current);
      const saved = await repos().workouts.updateSet(setId, sent);
      const latest = findSet(runRef.current, setId);
      if (!latest) return;
      replaceRun(mapSet(runRef.current, setId, set => ({ ...set, version: saved.version, updatedAt: saved.updatedAt })));
      const stillLatest = findSet(runRef.current, setId);
      if (!timers.current.has(setId) && stillLatest && sameValues(stillLatest, sent)) removeWorkoutWrite(setId);
    });
    inFlight.current.set(setId, task);
    try {
      await task;
      failedSets.current.delete(setId);
      saveFailed.current = failedSets.current.size > 0;
      if (inFlight.current.get(setId) === task) inFlight.current.delete(setId);
      syncSaveState();
    } catch (cause) {
      if (inFlight.current.get(setId) === task) inFlight.current.delete(setId);
      failedSets.current.add(setId); saveFailed.current = true; syncSaveState(); setError(messageOf(cause));
    }
  }

  async function flush() {
    saveFailed.current = false;
    const scheduled = [...timers.current];
    for (const [setId, timer] of scheduled) { window.clearTimeout(timer); timers.current.delete(setId); }
    await Promise.all(scheduled.map(([setId]) => persistLatest(setId)));
    await Promise.allSettled([...inFlight.current.values()]);
    if (saveFailed.current || readPendingWorkoutWrites().some(item => item.workoutRunId === run.id)) throw new Error("仍有训练数据尚未保存，请重试。");
  }

  async function replayJournal() {
    if (replaying) return;
    const pending = readPendingWorkoutWrites().filter(item => item.workoutRunId === initialRun.id);
    if (!pending.length) return;
    setReplaying(true);
    setSaveState("Saving"); setError(""); saveFailed.current = false;
    try {
      const cloud = await reload();
      if (!cloud) throw new Error("找不到正在进行的训练。");
      for (const entry of pending) {
        const set = findSet(cloud, entry.setId);
        if (!set) throw new Error("这组记录已不存在，待保存内容仍保留。请核对训练记录。");
        if (!shouldReplayWorkoutWrite(set.updatedAt, entry.timestamp)) throw new Error("这组数据在另一端已更新。待保存内容仍保留，请先核对云端记录。");
        const saved = await repos().workouts.updateSet(entry.setId, { ...entry.patch, version: set.version });
        replaceRun(mapSet(runRef.current, entry.setId, value => ({ ...value, ...localValues(entry.patch), version: saved.version, updatedAt: saved.updatedAt })));
        removeWorkoutWrite(entry.setId);
      }
      failedSets.current.clear(); syncSaveState();
    } catch (cause) { saveFailed.current = true; setSaveState("Retry"); setError(messageOf(cause)); }
    finally { setReplaying(false); }
  }

  const current = nextPendingExercise(run);
  const completed = run.exercises.filter(item => item.status === "completed").length;

  async function addSet(exercise: WorkoutExercise, id = crypto.randomUUID()) { try { setSaveState("Saving"); await flush(); const set = await repos().workouts.addSet(exercise.id, id); replaceRun({ ...runRef.current, exercises: runRef.current.exercises.map(item => item.id === exercise.id ? { ...item, sets: item.sets.some(item => item.id === set.id) ? item.sets : [...item.sets, set] } : item) }); syncSaveState(); } catch (cause) { fail(cause, () => addSet(exercise, id)); } }
  async function deleteSet(setId: string) { try { setSaveState("Saving"); await flush(); await repos().workouts.deleteSet(setId); replaceRun({ ...runRef.current, exercises: runRef.current.exercises.map(item => ({ ...item, sets: item.sets.filter(set => set.id !== setId) })) }); setDeleteId(null); syncSaveState(); } catch (cause) { fail(cause, () => deleteSet(setId)); } }
  async function completeExercise(exercise: WorkoutExercise) { try { await flush(); await repos().workouts.completeExercise(exercise.id); await reload(); } catch (cause) { fail(cause, () => completeExercise(exercise)); } }
  async function finishWorkout() { try { await flush(); const latest = await repos().workouts.getActiveRun(); if (!latest || !canFinishWorkout(latest)) throw new Error("请先完成或跳过每个动作。"); await repos().workouts.completeRun(run.id, latest.version); setConfirmFinish(false); await onExit(); } catch (cause) { fail(cause); } }
  async function abandonWorkout() { if (!window.confirm("重置本次训练？\n\n当前填写内容不会计入 History，也不会推进 Today。下次进入将从这堂课重新开始。")) return; try { await flush(); const latest = await repos().workouts.getActiveRun(); if (!latest || latest.id !== run.id) throw new Error("找不到正在进行的训练。"); await repos().workouts.abandonRun(run.id, latest.version); await onExit(); } catch (cause) { fail(cause); } }
  async function pauseWorkout() { try { await flush(); await onExit(); } catch (cause) { fail(cause); } }
  async function reorder(ids:string[]){setSaveState('Saving');try{await flush();replaceRun(await repos().workouts.reorderExercises(runRef.current.id,ids,runRef.current.version));syncSaveState();}catch(cause){fail(cause,()=>reorder(ids));throw cause;}}
  function fail(cause: unknown, retry?: () => Promise<void>) { operationRetry.current = retry ?? (async () => { await reload(); saveFailed.current = false; operationRetry.current = null; syncSaveState(); }); saveFailed.current = true; setSaveState("Retry"); setError(messageOf(cause)); }
  async function retryWrites() {
    const operation = operationRetry.current;
    if (inFlight.current.size || timers.current.size) { try { await flush(); } catch { /* replay remaining journal below */ } }
    await replayJournal();
    if (readPendingWorkoutWrites().some(item => item.workoutRunId === runRef.current.id)) return;
    if (operation) { operationRetry.current = null; saveFailed.current = false; await operation(); }
  }

  return <div className="workout execution">
    <header><button onClick={pauseWorkout}>← 暂停</button><div><small>{saveState}</small><h2>{run.sessionSnapshot.name}</h2></div><button className="primary" disabled={!canFinishWorkout(run)||saveState!=="Saved"} onClick={()=>setConfirmFinish(true)}>完成训练</button></header>
    <div className={`workout-save-strip ${saveState==="Retry"?"failed":""}`} role="status"><span>{saveState==="Retry"?`Save failed · ${failedSets.current.size||1} 项需要重试`:saveState==="Saving"?"Saving…":"Saved"}</span>{saveState==="Retry"&&<button onClick={()=>void retryWrites()}>Retry</button>}{saveState==="Retry"&&error&&<small>{error}</small>}</div>
    <main><div className="workout-progress"><span>{completed} / {run.exercises.length} exercises</span><i><b style={{width:`${run.exercises.length?completed/run.exercises.length*100:0}%`}}/></i></div>
      <ExerciseOrder ids={run.exercises.map(e=>e.id)} disabled={replaying||saveState!=="Saved"} onOrder={reorder} renderItem={(id,index,handle)=>{const e=run.exercises.find(item=>item.id===id)!;return <div className="workout-order-row">{handle}<span>{String(index+1).padStart(2,"0")} · {e.exerciseSnapshot.nameZh}<small>{e.exerciseSnapshot.nameEn} · {e.status==="completed"?"✓ 已完成":e.id===current?.id?"当前":"待训练"}</small></span>{run.exercises.length>1&&e.status!=="completed"&&!e.sets.some(s=>s.completed)&&<button className="workout-remove-action" disabled={saveState!=="Saved"} onClick={async()=>{try{await flush();setRemovingAction(e);}catch(cause){fail(cause);}}}>删除</button>}</div>;}}/>
      <button className="plan-replace-trigger" disabled={saveState!=="Saved"||run.exercises.length>=10} onClick={async()=>{try{await flush();setAddingAction(true);}catch(cause){fail(cause);}}}>＋ 增加动作</button>
      {run.exercises.length>7&&<p className="session-action-guidance">动作较多，请留意训练时长与恢复。</p>}
      <button className="abandon-workout" disabled={saveState==="Saving"} onClick={abandonWorkout}>重置本次训练</button>
      {run.sessionSnapshot.toleranceGuidance&&<details className="tolerance-guidance"><summary>动作耐受参考</summary><p>{run.sessionSnapshot.toleranceGuidance}</p><small>可在每组备注中记录疼痛分数、调整方式和感受。</small></details>}
      {run.exercises.filter(item=>item.status==="completed").map(item=><details className="completed-exercise" key={item.id}><summary>✓ {item.exerciseSnapshot.nameZh}</summary><p>{item.sets.filter(set=>set.completed).length} 组完成</p></details>)}
      {current&&<ExerciseExecution disabled={replaying} exercise={current} onPatch={queueSet} onAdd={()=>addSet(current)} deleteId={deleteId} setDeleteId={setDeleteId} onDelete={deleteSet} onComplete={()=>completeExercise(current)} onReplace={async()=>{try{await flush();setReplacing(current);}catch(cause){fail(cause);}}}/>}
      <section className="up-next"><small>UP NEXT</small>{run.exercises.filter(item=>item.status==="pending"&&item.id!==current?.id).map(item=><p key={item.id}><b>{item.exerciseSnapshot.nameZh}</b></p>)}</section>
    </main>
    {replacing&&<ExercisePicker allowPlanDefault={Boolean(replacing.sourceIntentId&&run.sourcePlanId)} intent={replacing.intentSnapshot} currentId={replacing.selectedVariationId} selectedIds={run.exercises.filter(item=>item.id!==replacing.id).map(item=>item.selectedVariationId)} close={()=>setReplacing(null)} choose={async(id,adjustment,scope)=>{await repos().workouts.selectExercise(replacing.id,id,"preference",undefined,{scope,adjustment});await reload();}}/>}
    {addingAction&&<AddWorkoutAction run={run} close={()=>setAddingAction(false)} choose={async(id,scope)=>{await flush();replaceRun(await repos().workouts.addExercise(run.id,id,scope));}}/>}
    {removingAction&&<RemoveWorkoutAction name={removingAction.exerciseSnapshot.nameZh} canSync={Boolean(removingAction.sourceIntentId&&run.sourcePlanId)} close={()=>setRemovingAction(null)} remove={async scope=>{await flush();replaceRun(await repos().workouts.removeExercise(removingAction.id,scope));}}/>}
    {confirmFinish&&<div className="finish-confirm" role="dialog" aria-modal="true" aria-labelledby="finish-title"><section><small>COMPLETE WORKOUT</small><h2 id="finish-title">确认完成本次训练？</h2><p>完成本次训练后，Today 将推进到下一堂训练课。</p><div><button onClick={()=>setConfirmFinish(false)}>继续检查</button><button className="primary" onClick={finishWorkout}>确认完成</button></div></section></div>}
  </div>;
}

function ExerciseExecution({ disabled, exercise, onPatch, onAdd, deleteId, setDeleteId, onDelete, onComplete, onReplace }: { disabled: boolean; exercise: WorkoutExercise; onPatch: (id: string, patch: SetValues, immediate?: boolean) => void; onAdd: () => void; deleteId: string | null; setDeleteId: (id: string | null) => void; onDelete: (id: string) => void; onComplete: () => void; onReplace: () => void }) {
  const [last, setLast] = useState<string[]>([]);
  const variation = getVariationMetadata(exercise.selectedVariationId);
  const loadTrackingType = variation?.loadTrackingType ?? "externalLoad";
  const loadCopy = loadInputCopy(loadTrackingType);
  const measurement=exercise.sets.find(s=>!s.completed)?.measurementSnapshot??exercise.sets[0]?.measurementSnapshot??repsMeasurement;
  const measurementKey=JSON.stringify(measurement);
  useEffect(() => {
    let current = true;
    setLast([]);
    void repos().workouts.getLastPerformance(exercise.selectedVariationId,measurement).then(value => {
      if (current) setLast(value?.sets.map(set => formatMeasuredPerformance(set, loadTrackingType)) ?? []);
    });
    return () => { current = false; };
  }, [exercise.selectedVariationId, loadTrackingType,measurementKey]);
  return <fieldset className="execution-fieldset" disabled={disabled}><section className="current-exercise"><header><div><small>CURRENT EXERCISE</small><h1>{exercise.exerciseSnapshot.nameZh}</h1><p>{exercise.exerciseSnapshot.nameEn}</p></div><div className="exercise-secondary-actions">{variation?.tutorialUrl && <a href={variation.tutorialUrl} target="_blank" rel="noreferrer">动作教程 ↗<small>{variation.tutorialSource}</small></a>}<button onClick={onReplace}>替换动作</button></div></header>{last.length > 0 && <aside><small>LAST TIME</small>{last.map((text, index) => <span key={index}>{text}</span>)}</aside>}<div className="execution-sets">{exercise.sets.map((set, index) => <div className={set.completed ? "complete" : ""} key={set.id}>{(variation?.allowedMeasurementModes?.length??0)>1&&<div className="measurement-switch" role="group" aria-label={`第 ${index+1} 组计量方式`}>{variation!.allowedMeasurementModes!.map(mode=><button type="button" key={mode} disabled={set.completed} aria-pressed={(set.measurementSnapshot??repsMeasurement).types.includes(mode)} onClick={()=>onPatch(set.id,{measurementSnapshot:selectMeasurement(mode,set.measurementSnapshot)},true)}>{modeLabels[mode]}</button>)}</div>}<button className="set-check" aria-label={`${set.completed ? "取消完成" : "完成"}第 ${index + 1} 组`} onClick={() => onPatch(set.id, { completed: !set.completed, actualLoad: set.actualLoad ?? set.targetLoad, actualReps: set.actualReps ?? set.targetReps, actualDurationSeconds: set.actualDurationSeconds ?? set.targetDurationSeconds, actualBreaths: set.actualBreaths ?? set.targetBreaths }, true)}>{set.completed ? "✓" : index + 1}</button>{(set.measurementSnapshot ?? repsMeasurement).trackLoad && <label><span>{loadCopy.label}</span><span className="load-input">{loadCopy.prefix && <i>{loadCopy.prefix}</i>}<input aria-label={`第 ${index + 1} 组${loadCopy.aria}`} inputMode="decimal" type="number" min="0" step="any" value={set.actualLoad ?? ""} placeholder={String(set.targetLoad ?? 0)} onChange={event => onPatch(set.id, { actualLoad: numberOrUndefined(event.target.value) })}/></span></label>}{(set.measurementSnapshot ?? repsMeasurement).types.includes("reps") && <label><span>REPS</span><input aria-label={`第 ${index + 1} 组次数`} inputMode="numeric" type="number" min="0" step="1" value={set.actualReps ?? ""} placeholder={String((set.measurementSnapshot??repsMeasurement).types.includes("reps")?set.targetReps??"": "")} onChange={event => onPatch(set.id, { actualReps: numberOrUndefined(event.target.value) })}/></label>}{(set.measurementSnapshot?.types ?? []).filter(type => type !== "reps").map(type => <label key={type}><span>{type === "duration" ? "SECONDS" : "BREATHS"}</span><input aria-label={`第 ${index + 1} 组${type === "duration" ? "秒数" : "呼吸次数"}`} inputMode="numeric" type="number" min="0" step={type === "duration" ? "any" : "1"} value={(type === "duration" ? set.actualDurationSeconds : set.actualBreaths) ?? ""} placeholder={String((type === "duration" ? set.targetDurationSeconds : set.targetBreaths) ?? "")} onChange={event => onPatch(set.id, type === "duration" ? { actualDurationSeconds: numberOrUndefined(event.target.value) } : { actualBreaths: numberOrUndefined(event.target.value) })}/></label>)}<small>目标 {formatMeasuredPerformance({ measurementSnapshot: set.measurementSnapshot, actualLoad: set.targetLoad, actualReps: set.targetReps, actualDurationSeconds: set.targetDurationSeconds, actualBreaths: set.targetBreaths }, loadTrackingType)} · RPE {set.targetRPE ?? "—"}</small>{deleteId === set.id ? <span className="confirm-delete">删除？ <button onClick={() => onDelete(set.id)}>确认</button><button onClick={() => setDeleteId(null)}>取消</button></span> : <button className="delete-set" aria-label={`删除第 ${index + 1} 组`} onClick={() => setDeleteId(set.id)}>×</button>}</div>)}</div><button className="add-set" onClick={onAdd}>＋ 添加一组</button><button className="complete-exercise" onClick={onComplete}>完成动作 →</button></section></fieldset>;
}

function ReplaceSheet({ exercise, close, done }: { exercise: WorkoutExercise; close: () => void; done: () => Promise<void> }) {
  const [reason, setReason] = useState<ReplacementReason>("equipmentUnavailable"); const [busy, setBusy] = useState(false);
  const candidates = rankSubstitutions(exercise.intentSnapshot, exercise.selectedVariationId);
  async function choose(id: string) { setBusy(true); try { await repos().workouts.selectExercise(exercise.id, id, reason); await done(); } finally { setBusy(false); } }
  return <div className="replace-overlay" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section><header><div><small>INTENT 保持不变</small><h2>替换 {exercise.exerciseSnapshot.nameZh}</h2></div><button aria-label="关闭替换动作" onClick={close}>×</button></header><label>替换原因<select value={reason} onChange={event => setReason(event.target.value as ReplacementReason)}><option value="equipmentUnavailable">器械不可用</option><option value="painOrDiscomfort">疼痛或不适</option><option value="difficultyAdjustment">难度调整</option><option value="preference">个人偏好</option><option value="coachInstruction">教练指示</option><option value="other">其他</option></select></label><div>{candidates.length ? candidates.map(item => { const display = getVariationDisplay(item.variation.id); return <button disabled={busy} key={item.variation.id} onClick={() => choose(item.variation.id)}><span>{display.nameZh}<small>{display.nameEn}</small></span><b>选择 →</b></button>; }) : <p>目前没有足够匹配的替代动作。保留原动作更安全。</p>}</div></section></div>;
}

function InlineError({ text, retry }: { text: string; retry: () => void | Promise<void> }) { return <div className="inline-error"><span>{text}</span><button onClick={() => void retry()}>重试</button></div>; }
function findSet(run: WorkoutRunAggregate, id: string) { return run.exercises.flatMap(item => item.sets).find(item => item.id === id); }
function mapSet(run: WorkoutRunAggregate, id: string, update: (set: WorkoutSet) => WorkoutSet): WorkoutRunAggregate { return { ...run, exercises: run.exercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => set.id === id ? update(set) : set) })) }; }
function localValues(patch: SetValues): Partial<WorkoutSet> { return Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value === null ? undefined : value])); }
function toPatch(set: WorkoutSet): WorkoutSetPatch { return { measurementSnapshot:set.measurementSnapshot, actualLoad: set.actualLoad ?? null, actualReps: set.actualReps ?? null, actualDurationSeconds: set.actualDurationSeconds ?? null, actualBreaths: set.actualBreaths ?? null, actualRPE: set.actualRPE ?? null, actualRIR: set.actualRIR ?? null, completed: set.completed, note: set.note, version: set.version }; }
function sameValues(set: WorkoutSet, patch: WorkoutSetPatch) { return JSON.stringify(set.measurementSnapshot)===JSON.stringify(patch.measurementSnapshot) && (set.actualLoad ?? null) === patch.actualLoad && (set.actualReps ?? null) === patch.actualReps && (set.actualDurationSeconds ?? null) === patch.actualDurationSeconds && (set.actualBreaths ?? null) === patch.actualBreaths && (set.actualRPE ?? null) === patch.actualRPE && (set.actualRIR ?? null) === patch.actualRIR && set.completed === patch.completed && set.note === patch.note; }
function numberOrUndefined(value: string) { return value === "" ? undefined : Number(value); }
function messageOf(value: unknown) { if (value instanceof Error) return value.message; if (value && typeof value === "object" && "message" in value && typeof value.message === "string") return value.message; return String(value); }
