import { useState } from "react";
import type { TrainingIntentSnapshot, WorkoutChangeScope } from "./domain/training";
import { ReplacementSheet } from "./ReplacementSheet";
import type {MeasurementAdjustment} from "./replacement-engine";

/** Today and warm-up share the candidate engine; persistence remains caller-owned. */
export function ExercisePicker({intent,currentId,selectedIds=[],choose,close,allowPlanDefault=false,addMode=false}:{
  intent:TrainingIntentSnapshot;currentId:string;selectedIds?:string[];
  choose:(id:string,adjustment?:MeasurementAdjustment,scope?:WorkoutChangeScope)=>Promise<void>;close:()=>void;
  allowPlanDefault?:boolean;addMode?:boolean;
}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [scope,setScope]=useState<WorkoutChangeScope>("workout");
  return <ReplacementSheet intent={intent} currentId={currentId} selectedIds={selectedIds} busy={busy} error={error} close={close}
    addMode={addMode} allowMeasurementChange={!intent.preparationIntent} beforeChoices={allowPlanDefault?<fieldset className="workout-change-scope"><legend>应用范围</legend><label><input type="radio" checked={scope==="workout"} onChange={()=>setScope("workout")}/>仅本次训练</label><label><input type="radio" checked={scope==="plan"} onChange={()=>setScope("plan")}/>{addMode?"同步修改计划":"设为今后默认"}</label><small>已生成的其他训练与历史记录保持原样。</small></fieldset>:undefined}
    choose={async(id,adjustment)=>{setBusy(true);setError("");try{await choose(id,adjustment,scope);close();}catch(cause){setError(cause instanceof Error?cause.message:String(cause));}finally{setBusy(false);}}}/>;
}
