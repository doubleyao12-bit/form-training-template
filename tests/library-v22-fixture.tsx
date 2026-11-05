// Synthetic UI acceptance only. This fixture never connects to Auth or Cloud.
import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {ExercisesPage} from "../src/CloudTrainingApp";
import {ExercisePicker} from "../src/ExercisePicker";
import {PlanEditor} from "../src/PlanEditor";
import {createExampleTrainingPlan} from "../src/training-playbook";
import type {TrainingPlanAggregate,TrainingPlanDraft} from "../src/domain/training";
import "../src/styles.css";

const original=createExampleTrainingPlan();
const squatIndex=original.sessions[0].intents.findIndex(item=>item.movementPattern==="Squat");
function aggregate(draft:TrainingPlanDraft):TrainingPlanAggregate {
  return {...draft,id:"same-plan-id",userId:"fixture",status:"active",createdAt:"2026-10-01",updatedAt:"2026-10-01",
    sessions:draft.sessions.map((session,index)=>({...session,id:`session-${index}`,userId:"fixture",planId:"same-plan-id",createdAt:"2026-10-01",updatedAt:"2026-10-01",
      intents:session.intents.map((intent,position)=>({...intent,id:`intent-${index}-${position}`,userId:"fixture",sessionTemplateId:`session-${index}`,explicitOptionIds:intent.explicitOptionIds??[],createdAt:"2026-10-01",updatedAt:"2026-10-01"}))}))};
}
function PlanFixture(){const[plan,setPlan]=useState(()=>aggregate(original));const[editing,setEditing]=useState(true);
  return <main className="v1-main"><p data-testid="plan-id">{plan.id}</p><p data-testid="plan-default">{plan.sessions[0].intents[squatIndex].defaultVariationId}</p>
    {editing?<PlanEditor plan={plan} busy={false} initialReplace={{session:0,intent:squatIndex}} cancel={()=>setEditing(false)} save={async draft=>{setPlan(aggregate(draft));setEditing(false);}}/>:
      <button onClick={()=>setEditing(true)}>重新打开原计划</button>}</main>;
}
function TodayFixture(){const[selection,setSelection]=useState("back-squat--legacy-default");const planDefault="back-squat--legacy-default";
  const intent={label:"深蹲",order:0,movementPattern:"Squat" as const,trainingGoal:"strength" as const,defaultVariationId:planDefault,explicitOptionIds:[],prescription:{measurement:{version:1 as const,types:["reps" as const]}}};
  return <main className="v1-main"><p data-testid="plan-default">{planDefault}</p><p data-testid="workout-selection">{selection}</p><ExercisePicker intent={intent} currentId={selection} choose={async id=>setSelection(id)} close={()=>{}}/></main>;
}
const mode=new URLSearchParams(location.search).get("mode");
createRoot(document.getElementById("root")!).render(<div className="v1">{mode==="plan"?<PlanFixture/>:mode==="today"?<TodayFixture/>:<main className="v1-main"><ExercisesPage onSession={()=>{}}/></main>}</div>);
