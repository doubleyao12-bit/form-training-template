import {useState} from "react";
import {ExercisePicker} from "./ExercisePicker";
import type {WorkoutChangeScope,WorkoutRunAggregate} from "./domain/training";
export function AddWorkoutAction({run,choose,close}:{run:WorkoutRunAggregate|null;choose:(id:string,scope:WorkoutChangeScope)=>Promise<void>;close:()=>void}){
  return <ExercisePicker addMode allowPlanDefault={Boolean(run?.sourcePlanId)} intent={{label:"增加动作",order:run?.exercises.length??0,defaultVariationId:"",explicitOptionIds:[]}} currentId="" selectedIds={run?.exercises.map(e=>e.selectedVariationId)} choose={(id,_adjustment,scope)=>choose(id,scope??'workout')} close={close}/>;
}
export function RemoveWorkoutAction({name,canSync,remove,close}:{name:string;canSync:boolean;remove:(scope:WorkoutChangeScope)=>Promise<void>;close:()=>void}){
  const[scope,setScope]=useState<WorkoutChangeScope>('workout');const[busy,setBusy]=useState(false);const[error,setError]=useState('');
  return <div className="finish-confirm" role="dialog" aria-modal="true"><section><h2>删除 {name}？</h2><p>仅删除尚未完成的动作。历史训练记录保持原样。</p><fieldset className="workout-change-scope"><legend>应用范围</legend><label><input type="radio" checked={scope==='workout'} onChange={()=>setScope('workout')}/>仅本次训练</label>{canSync&&<label><input type="radio" checked={scope==='plan'} onChange={()=>setScope('plan')}/>同步修改计划</label>}</fieldset>{error&&<p role="alert">{error}</p>}<div><button disabled={busy} onClick={close}>取消</button><button disabled={busy} onClick={async()=>{setBusy(true);try{await remove(scope);close();}catch(cause){setError(cause instanceof Error?cause.message:String(cause));}finally{setBusy(false);}}}>{busy?'保存中…':'确认删除'}</button></div></section></div>;
}
