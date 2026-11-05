import { useState, type ReactNode } from "react";
import type { TrainingIntentSnapshot, MeasurementSnapshot } from "./domain/training";
import { exerciseLibraryV1 } from "./library-v1";
import { getConcreteVariationDisplay } from "./exercise-display";
import { equipmentChoices, replacementCandidates, supportsPrescription, type MeasurementAdjustment } from "./replacement-engine";
import { exerciseFamilyGroups } from "./exercise-family";
import { equipmentVocabulary, movementPatterns } from "./types";
import type { ExerciseVariationV03 } from "./schema.v03";
import {matchesAction} from "./catalog-search";

export function ReplacementSheet({intent,currentId,selectedIds=[],choose,close,busy=false,allowMeasurementChange=false,error="",beforeChoices,addMode=false}:{
  intent: TrainingIntentSnapshot; currentId:string; selectedIds?:string[];
  choose:(id:string,adjustment?:MeasurementAdjustment)=>Promise<void>|void; close:()=>void;
  busy?:boolean; allowMeasurementChange?:boolean; error?:string; beforeChoices?:ReactNode;
  addMode?:boolean;
}) {
  const [browse,setBrowse]=useState(addMode);
  const [equipment,setEquipment]=useState<string|null>(null);
  const [query,setQuery]=useState("");
  const [adjusting,setAdjusting]=useState<ExerciseVariationV03|null>(null);
  const [mode,setMode]=useState<MeasurementSnapshot["types"][number]>("reps");
  const [target,setTarget]=useState("");
  const [localError,setLocalError]=useState("");
  const current=getConcreteVariationDisplay(currentId);
  const currentVariation=exerciseLibraryV1.variations.find(item=>item.id===currentId);
  const currentExercise=exerciseLibraryV1.exercises.find(item=>item.id===currentVariation?.exerciseId);
  const preparationIntent=intent.preparationIntent;
  const selectedExercises=new Set(selectedIds.map(id=>exerciseLibraryV1.variations.find(v=>v.id===id)?.exerciseId).filter(Boolean));
  const candidates=replacementCandidates(intent,currentId,selectedIds);
  const recommended=candidates.slice(0,12);
  const equipmentOptions=equipmentChoices(intent,currentId,selectedIds);
  const shown=equipment?candidates.filter(item=>item.variation.equipment.includes(equipment as keyof typeof equipmentVocabulary)):recommended;
  function request(id:string) {
    const variation=exerciseLibraryV1.variations.find(item=>item.id===id);
    if(!variation||busy)return;
    if(addMode||supportsPrescription(variation,intent)){void choose(id);return;}
    if(!allowMeasurementChange)return;
    setAdjusting(variation);setMode(variation.allowedMeasurementModes?.[0]??"reps");setTarget("");setLocalError("");
  }
  function adjust() {
    if(!adjusting)return;
    const numeric=Number(target);
    if(!Number.isFinite(numeric)||numeric<=0){setLocalError("请填写大于 0 的目标值。");return;}
    void choose(adjusting.id,{mode,target:numeric});
  }
  const option=(variation:ExerciseVariationV03,reason:string)=>{
    const display=getConcreteVariationDisplay(variation.id);
    const compatible=addMode||supportsPrescription(variation,intent);
    const owner=exerciseLibraryV1.exercises.find(item=>item.id===variation.exerciseId);
    return <button type="button" className="replacement-option" key={variation.id} disabled={busy||(!compatible&&!allowMeasurementChange)} onClick={()=>request(variation.id)}>
      <span><b>{display.nameZh}</b><small>{display.nameEn}</small><em>{variation.equipment.map(key=>equipmentVocabulary[key]).join(" · ")||"徒手"} · {reason}</em>
        <small>{owner?.primaryCapacity} · {owner?.limbConfiguration==="unilateral"?"单侧":owner?.limbConfiguration==="splitStance"?"分腿":"双侧"}{!compatible?allowMeasurementChange?" · 调整计量后替换":" · 当前处方不兼容":""}</small></span><span aria-hidden="true">→</span>
    </button>;
  };
  const all=exerciseLibraryV1.exercises.filter(item=>item.id!==currentExercise?.id||exerciseLibraryV1.variations.some(v=>v.exerciseId===item.id&&v.id!==currentId))
    .filter(item=>!selectedExercises.has(item.id)).filter(item=>!preparationIntent||exerciseLibraryV1.variations.some(v=>v.exerciseId===item.id&&v.preparationIntents?.includes(preparationIntent)));
  const lower=query.trim().toLowerCase();
  const familyContent=(items:typeof all)=>exerciseFamilyGroups(items).map(group=><details key={group.id}><summary>{group.label}<small>{group.exercises.length} 个动作</small></summary>
    {group.exercises.flatMap(exercise=>exerciseLibraryV1.variations.filter(v=>v.exerciseId===exercise.id&&v.id!==currentId&&(!preparationIntent||v.preparationIntents?.includes(preparationIntent)))
      .filter(v=>!lower||matchesAction(v.id,lower))
      .map(v=>option(v,group.label)))}</details>);
  return <div className="replace-overlay" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)close();}}>
    <section className="plan-replacement-sheet" role="dialog" aria-modal="true" aria-label="替换动作">
      <header><div><small>{addMode?"从动作库选择":`当前动作 · ${current.nameZh}`}</small><h2>{addMode?"增加动作":"替换动作"}</h2></div><button type="button" disabled={busy} onClick={close} aria-label="关闭">×</button></header>
      {error&&<p role="alert" className="error-copy">{error}</p>}
      {beforeChoices}
      {adjusting?<div className="replacement-adjust"><h3>调整新动作的计量处方</h3><p>{getConcreteVariationDisplay(adjusting.id).nameZh} 不支持原有计量；确认新的计量与目标后才替换。</p>
        <label>计量方式<select value={mode} onChange={event=>setMode(event.target.value as typeof mode)}>{adjusting.allowedMeasurementModes?.map(value=><option key={value} value={value}>{value==="reps"?"次数":value==="duration"?"秒数":"呼吸次数"}</option>)}</select></label>
        <label>目标{mode==="duration"?"秒数":mode==="breaths"?"呼吸次数":"次数"}<input type="number" min="1" value={target} onChange={event=>setTarget(event.target.value)} /></label>
        {localError&&<p role="alert" className="error-copy">{localError}</p>}
        <div className="replacement-adjust-actions"><button type="button" onClick={()=>setAdjusting(null)}>返回</button><button type="button" className="primary" disabled={busy} onClick={adjust}>确认调整并替换</button></div>
      </div>:<>{equipmentOptions.length>0&&<div className="replacement-equipment"><h3>按器械快速选择</h3><div>{equipmentOptions.map(item=><button type="button" key={item.equipmentId} aria-pressed={equipment===item.equipmentId} disabled={busy} onClick={()=>{if(item.actions.length===1){request(item.actions[0].variation.id);}else{setEquipment(equipment===item.equipmentId?null:item.equipmentId);setBrowse(false);}}}>{equipmentVocabulary[item.equipmentId as keyof typeof equipmentVocabulary]??item.equipmentId}<small>{item.actions.length}</small></button>)}</div></div>}
        {!browse?<><h3>{equipment?"该器械的相关动作":"高相关替换"}</h3><div className="replacement-options">{shown.map(item=>option(item.variation,item.reason))}{!shown.length&&<p>此器械下没有其他兼容动作，可浏览完整动作库。</p>}</div><button type="button" className="replacement-browse" onClick={()=>{setBrowse(true);setEquipment(null);}}>浏览完整动作库 →</button></>:
        <>{!addMode&&<button type="button" className="replacement-back" onClick={()=>setBrowse(false)}>← 返回高相关替换</button>}<label className="replacement-search">搜索具体动作<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="名称、器械或动作族" /></label>
          {lower?<div className="replacement-options"><h3>搜索结果</h3>{all.flatMap(e=>exerciseLibraryV1.variations.filter(v=>v.exerciseId===e.id&&v.id!==currentId&&(!preparationIntent||v.preparationIntents?.includes(preparationIntent))&&matchesAction(v.id,lower))).map(v=>option(v,"动作库搜索"))}{!all.some(e=>exerciseLibraryV1.variations.some(v=>v.exerciseId===e.id&&v.id!==currentId&&matchesAction(v.id,lower)))&&<p role="status">没有匹配动作，请尝试其他名称或器械。</p>}</div>:
          <div className="replacement-families">{[...movementPatterns,null].map(pattern=>{const items=all.filter(item=>item.primaryMovementPattern===pattern);return items.length?<details key={pattern??"other"}><summary>{pattern??"辅助训练"}<small>{items.length} 个动作</small></summary>{familyContent(items)}</details>:null;})}</div>}</>}
      </>}
    </section>
  </div>;
}
