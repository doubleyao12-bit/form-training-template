import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Today } from "../src/CloudTrainingApp";
import WorkoutScreen from "../src/WorkoutScreen";
import { ExercisePicker } from "../src/ExercisePicker";
import { recoveryStrengthWeekV05 } from "../src/recovery-plan";
import { getVariationDisplay } from "../src/exercise-display";
import { newRunPrescription } from "../src/measurement";
import {exerciseLibraryV1} from '../src/library-v1';
import type { TrainingPlanAggregate, WorkoutRunAggregate } from "../src/domain/training";

const draft=recoveryStrengthWeekV05();
const plan:TrainingPlanAggregate={...draft,id:"fixture-plan",userId:"fixture-user",status:"active",createdAt:"now",updatedAt:"now",sessions:draft.sessions.map((session,i)=>({...session,id:`fixture-session-${i}`,userId:"fixture-user",planId:"fixture-plan",createdAt:"now",updatedAt:"now",intents:session.intents.map((intent,j)=>({...intent,id:`fixture-intent-${i}-${j}`,userId:"fixture-user",sessionTemplateId:`fixture-session-${i}`,explicitOptionIds:intent.explicitOptionIds??[],createdAt:"now",updatedAt:"now"}))}))};
const session=plan.sessions[0];
const run:WorkoutRunAggregate={id:"fixture-run",userId:"fixture-user",sourcePlanId:plan.id,sourceSessionTemplateId:session.id,status:"inProgress",version:1,createdAt:"now",updatedAt:"now",sessionSnapshot:{name:session.name,order:0,capturedAt:"now"},exercises:session.intents.map((intent,i)=>{const prescription=newRunPrescription(intent.defaultVariationId,intent.prescription);const replacement=i===0?'barbell-overhead-press--default':i===1?'side-plank--default':intent.defaultVariationId;return {id:`fixture-exercise-${i}`,userId:"fixture-user",workoutRunId:"fixture-run",order:i,intentSnapshot:{...intent,label:i<2?'ORIGINAL INTENT':intent.label,prescription},defaultVariationId:intent.defaultVariationId,selectedVariationId:replacement,exerciseSnapshot:{exerciseId:"fixture",variationId:intent.defaultVariationId,nameZh:i<2?'ORIGINAL SNAPSHOT':getVariationDisplay(intent.defaultVariationId).nameZh,nameEn:i<2?'Old Snapshot':getVariationDisplay(intent.defaultVariationId).nameEn},status:"pending",sets:Array.from({length:prescription.sets??1},(_,j)=>({id:`fixture-set-${i}-${j}`,userId:"fixture-user",workoutExerciseId:`fixture-exercise-${i}`,order:j,targetReps:prescription.targetReps,targetDurationSeconds:prescription.targetDurationSeconds,targetBreaths:prescription.targetBreaths,measurementSnapshot:prescription.measurement,completed:false,version:1,updatedAt:"now"}))};})};
mkdirSync(".validation",{recursive:true});
writeFileSync('.validation/mobile-long-titles.json',JSON.stringify([...exerciseLibraryV1.exercises].sort((a,b)=>b.nameZh.length-a.nameZh.length).slice(0,4).map(e=>e.nameZh)));
const css=readFileSync("src/styles.css","utf8");
function output(name:string,node:React.ReactNode){writeFileSync(`.validation/${name}.html`,`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${renderToStaticMarkup(node)}</body></html>`);}
output("today",<div className="v1"><main className="v1-main"><Today plan={plan} next={session} activeRun={run} state="ready" start={()=>{}} go={()=>{}} onRunChanged={()=>{}}/></main></div>);
output("workout",<WorkoutScreen run={run} onExit={async()=>{}}/>);
const holdRun={...run,exercises:run.exercises.filter(item=>item.sets[0].measurementSnapshot?.types.includes("duration"))};
output("hold",<WorkoutScreen run={holdRun} onExit={async()=>{}}/>);
output("map",<ExercisePicker intent={run.exercises[0].intentSnapshot} currentId={run.exercises[0].selectedVariationId} choose={async()=>{}} close={()=>{}}/>);
console.log("Local-only SSR fixtures generated; no Supabase requests or data writes.");
