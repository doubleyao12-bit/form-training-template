import { useState, type FormEvent } from "react";
import type { TrainingPlanAggregate, TrainingPlanDraft } from "./domain/training";
import { getConcreteVariationDisplay, getVariationDisplay } from "./exercise-display";
import { warmupBlocks, warmupActions } from "./warmup";
import { draftFromPlan, replacePlanIntent, validateEditablePlan } from "./plan-edit";
import { PlanExerciseReplacement } from "./PlanExerciseReplacement";
import {ReplacementSheet} from "./ReplacementSheet";
import {newActionIntent,adjustedPrescription,resolveVariationId} from "./flexible-training";
import {newRunPrescription} from "./measurement";
import {modeLabels,type MeasurementMode} from "./measurement-modes";
import {ExerciseOrder} from "./ExerciseOrder";
import {jointFunctionVocabulary,type JointFunctionId} from './types';

export function PlanEditor({ plan, busy, save, cancel, initialReplace = null }: {
  plan: TrainingPlanAggregate; busy: boolean; save: (draft: TrainingPlanDraft) => Promise<void>; cancel: () => void;
  initialReplace?: {session:number; intent:number}|null;
}) {
  const [draft, setDraft] = useState(() => draftFromPlan(plan));
  const [error, setError] = useState("");
  const [replacing, setReplacing] = useState<{ session: number; intent: number } | null>(initialReplace);
  const [changedAction, setChangedAction] = useState<string | null>(null);
  const [adding,setAdding]=useState<number|null>(null);
  const [removing,setRemoving]=useState<{session:number;intent:number}|null>(null);
  const updateSession = (index: number, change: Partial<TrainingPlanDraft["sessions"][number]>) =>
    setDraft(value => ({ ...value, sessions: value.sessions.map((item, i) => i === index ? { ...item, ...change } : item) }));
  const updateIntent = (sessionIndex: number, intentIndex: number, change: Partial<TrainingPlanDraft["sessions"][number]["intents"][number]>) =>
    setDraft(value => ({ ...value, sessions: value.sessions.map((session, i) => i === sessionIndex ? {
      ...session, intents: session.intents.map((intent, j) => j === intentIndex ? { ...intent, ...change } : intent),
    } : session) }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    const issue = validateEditablePlan(draft);
    if (issue) { setError(issue); return; }
    setError("");
    try { await save(draft); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }
  return <form className="plan-editor" onSubmit={event => void submit(event)}>
    <header><h3>编辑训练计划</h3><p>保存后覆盖原计划，不创建副本。已完成的训练记录不会被改写。</p>{changedAction&&<p role="status" className="plan-editor-pending">已改为 {changedAction}，点击底部「保存到原计划」后才会生效。</p>}</header>
    <label>计划名称<input value={draft.name} onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} required /></label>
    <label>训练目标<textarea value={draft.goalSummary ?? ""} onChange={event => setDraft(value => ({ ...value, goalSummary: event.target.value }))} /></label>
    <label>周期名称<input value={draft.cycleName ?? ""} onChange={event => setDraft(value => ({ ...value, cycleName: event.target.value }))} /></label>
    <label>周期重点<textarea value={draft.cycleFocus ?? ""} onChange={event => setDraft(value => ({ ...value, cycleFocus: event.target.value }))} /></label>
    <label>设计说明<textarea value={draft.rationale ?? ""} onChange={event => setDraft(value => ({ ...value, rationale: event.target.value }))} /></label>
    <div className="plan-editor-numbers">
      <label>计划周数<input type="number" min="1" value={draft.plannedWeeks ?? ""} onChange={event => setDraft(value => ({ ...value, plannedWeeks: event.target.value ? Number(event.target.value) : undefined }))} /></label>
      <label>每周课数<input type="number" min="1" value={draft.expectedSessionsPerWeek ?? ""} onChange={event => setDraft(value => ({ ...value, expectedSessionsPerWeek: event.target.value ? Number(event.target.value) : undefined }))} /></label>
    </div>
    {draft.sessions.map((session, sessionIndex) => <details className="plan-editor-session" key={sessionIndex} open={initialReplace?.session===sessionIndex?true:undefined}>
      <summary>SESSION {sessionIndex + 1} · {session.name}</summary>
      <p className="session-action-guidance">{session.intents.length} 个正式动作 · 推荐 4–6 个，常规以 5 个为起点{session.intents.length>7?"。动作较多，请留意训练时长与恢复。":""}</p>
      <label>名称<input value={session.name} onChange={event => updateSession(sessionIndex, { name: event.target.value })} required /></label>
      <label>训练目的<textarea value={session.purpose ?? ""} onChange={event => updateSession(sessionIndex, { purpose: event.target.value })} /></label>
      <label>热身配置<select value={session.warmupBlock ? (Object.entries(warmupBlocks).find(([,block]) => block.id === session.warmupBlock?.id)?.[0] ?? "custom") : ""} onChange={event => updateSession(sessionIndex, { warmupBlock: event.target.value === "custom" ? session.warmupBlock : event.target.value ? warmupBlocks[event.target.value as keyof typeof warmupBlocks] : undefined })}>
        <option value="">未配置热身</option>{session.warmupBlock && <option value="custom">保留当前自定义热身</option>}{Object.entries(warmupBlocks).map(([key,block]) => <option key={key} value={key}>{key} · {block.title}</option>)}
      </select></label>
      {session.warmupBlock && <details><summary>热身内容 · {session.warmupBlock.title}</summary>
        <label>热身标题<input value={session.warmupBlock.title} onChange={event=>updateSession(sessionIndex,{warmupBlock:{...session.warmupBlock!,title:event.target.value}})} /></label>
        <label>热身重点<input value={session.warmupBlock.focus} onChange={event=>updateSession(sessionIndex,{warmupBlock:{...session.warmupBlock!,focus:event.target.value}})} /></label>
        <ol>{session.warmupBlock.exercises.map(item => <li key={item.id}>{warmupActions[item.defaultVariationId]?.nameZh ?? getVariationDisplay(item.defaultVariationId).nameZh}</li>)}</ol>
      </details>}
      <ExerciseOrder ids={session.intents.map(i=>i.id??`new:${i.defaultVariationId}`)} disabled={busy} onOrder={async ids=>updateSession(sessionIndex,{intents:ids.map((id,order)=>({...session.intents.find(i=>(i.id??`new:${i.defaultVariationId}`)===id)!,order}))})} renderItem={(key,_position,handle)=>{const intentIndex=session.intents.findIndex(i=>(i.id??`new:${i.defaultVariationId}`)===key);const intent=session.intents[intentIndex];return <div className="plan-editor-intent" key={intent.id??key}>
        <div className="plan-intent-toolbar">{handle}<label>训练角色<select value={intent.trainingRole??""} onChange={event=>updateIntent(sessionIndex,intentIndex,{trainingRole:(event.target.value||undefined) as typeof intent.trainingRole})}><option value="">保持原动作</option><option value="anchor">Anchor · 核心进步</option><option value="rotation">Rotation · 每轮合理轮换</option><option value="optional">Optional · 按需调整</option></select></label><button type="button" disabled={busy||session.intents.length<=1} onClick={()=>setRemoving({session:sessionIndex,intent:intentIndex})}>删除</button></div>
        <button type="button" className="plan-replace-trigger" onClick={() => setReplacing({ session: sessionIndex, intent: intentIndex })}>{intentIndex + 1}. {getConcreteVariationDisplay(intent.defaultVariationId).nameZh}<small>替换动作 →</small></button>
        <details className="plan-intent-prescription"><summary>调整训练处方</summary>
        <label>训练意图<input value={intent.label} onChange={event => updateIntent(sessionIndex, intentIndex, { label: event.target.value })} /></label>
        {intent.trainingRole==='rotation'&&<details className="rotation-boundaries"><summary>轮换功能边界（高级）</summary><p>默认保持当前关键功能与动作族。勾选后允许其中任一功能作为目标；动作模式、训练目标与计量仍必须兼容。</p>{Object.entries(jointFunctionVocabulary).map(([id,label])=><label key={id}><input type="checkbox" checked={intent.rotationJointFunctionIds?.includes(id as JointFunctionId)??false} onChange={event=>updateIntent(sessionIndex,intentIndex,{rotationJointFunctionIds:event.target.checked?[...(intent.rotationJointFunctionIds??[]),id as JointFunctionId]:intent.rotationJointFunctionIds?.filter(value=>value!==id)})}/>{label}</label>)}</details>}
        <label>计量方式<select value={newRunPrescription(intent.defaultVariationId,intent.prescription).measurement?.types[0]??'reps'} onChange={event=>{const mode=event.target.value as MeasurementMode;updateIntent(sessionIndex,intentIndex,{prescription:adjustedPrescription(intent.defaultVariationId,intent.prescription,{mode,target:mode==='reps'?8:mode==='duration'?30:5})});}}>{resolveVariationId(intent.defaultVariationId)?.allowedMeasurementModes?.map(mode=><option value={mode} key={mode}>{modeLabels[mode]}</option>)}</select></label>
        <div className="plan-editor-numbers">
          <label>组数<input type="number" min="1" value={intent.prescription?.sets ?? ""} onChange={event => updateIntent(sessionIndex,intentIndex,{ prescription: { ...intent.prescription, sets: event.target.value ? Number(event.target.value) : undefined } })} /></label>
          <label>次数<input type="number" min="0" value={intent.prescription?.targetReps ?? ""} onChange={event => updateIntent(sessionIndex,intentIndex,{ prescription: { ...intent.prescription, targetReps: event.target.value ? Number(event.target.value) : undefined } })} /></label>
          <label>秒数<input type="number" min="0" value={intent.prescription?.targetDurationSeconds ?? ""} onChange={event => updateIntent(sessionIndex,intentIndex,{ prescription: { ...intent.prescription, targetDurationSeconds: event.target.value ? Number(event.target.value) : undefined } })} /></label>
          <label>呼吸<input type="number" min="0" value={intent.prescription?.targetBreaths ?? ""} onChange={event => updateIntent(sessionIndex,intentIndex,{ prescription: { ...intent.prescription, targetBreaths: event.target.value ? Number(event.target.value) : undefined } })} /></label>
          <label>重量 kg<input type="number" min="0" step="0.5" value={intent.prescription?.targetLoad ?? ""} onChange={event => updateIntent(sessionIndex,intentIndex,{ prescription: { ...intent.prescription, targetLoad: event.target.value ? Number(event.target.value) : undefined } })} /></label>
          <label>RPE<input type="number" min="1" max="10" step="0.5" value={intent.prescription?.targetRPE ?? ""} onChange={event => updateIntent(sessionIndex,intentIndex,{ prescription: { ...intent.prescription, targetRPE: event.target.value ? Number(event.target.value) : undefined } })} /></label>
          <label>RIR<input type="number" min="0" max="10" value={intent.prescription?.targetRIR ?? ""} onChange={event => updateIntent(sessionIndex,intentIndex,{ prescription: { ...intent.prescription, targetRIR: event.target.value ? Number(event.target.value) : undefined } })} /></label>
          <label>休息秒数<input type="number" min="0" value={intent.prescription?.restSeconds ?? ""} onChange={event => updateIntent(sessionIndex,intentIndex,{ prescription: { ...intent.prescription, restSeconds: event.target.value ? Number(event.target.value) : undefined } })} /></label>
        </div></details>
      </div>;}}/>
      <button type="button" className="plan-replace-trigger" disabled={busy||session.intents.length>=10} onClick={()=>setAdding(sessionIndex)}>＋ 增加动作{session.intents.length>=10?"（已达 10 个）":""}</button>
    </details>)}
    {error && <p role="alert" className="error-copy">{error}</p>}
    <div className="plan-editor-actions"><button type="button" onClick={cancel}>取消</button><button className="primary" disabled={busy}>{busy ? "保存中…" : "保存到原计划"}</button></div>
    {replacing && <PlanExerciseReplacement intent={draft.sessions[replacing.session].intents[replacing.intent]}
      selectedIds={draft.sessions[replacing.session].intents.filter((_,index)=>index!==replacing.intent).map(item=>item.defaultVariationId)}
      choose={(id,adjustment) => {updateIntent(replacing.session,replacing.intent,replacePlanIntent(draft.sessions[replacing.session].intents[replacing.intent],id,adjustment));setChangedAction(getConcreteVariationDisplay(id).nameZh);}}
      close={() => setReplacing(null)} />}
    {adding!==null&&<ReplacementSheet addMode intent={{label:"增加动作",order:0,defaultVariationId:"",explicitOptionIds:[]}} currentId="" selectedIds={draft.sessions[adding].intents.map(i=>i.defaultVariationId)} close={()=>setAdding(null)} choose={id=>{const session=draft.sessions[adding];updateSession(adding,{intents:[...session.intents,newActionIntent(id,session.intents.length)]});setAdding(null);}}/>}
    {removing&&<div className="finish-confirm" role="dialog" aria-modal="true"><section><h2>从计划中删除这个动作？</h2><p>仅影响未来尚未生成的训练，已生成训练和历史保持原样。</p><div><button type="button" onClick={()=>setRemoving(null)}>取消</button><button type="button" onClick={()=>{const s=draft.sessions[removing.session];updateSession(removing.session,{intents:s.intents.filter((_,i)=>i!==removing.intent).map((item,order)=>({...item,order}))});setRemoving(null);}}>确认删除</button></div></section></div>}
  </form>;
}
