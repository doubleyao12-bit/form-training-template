import {exerciseLibraryV1} from "./library-v1";
import {newRunPrescription} from "./measurement";
import {supportsPrescription, type MeasurementAdjustment} from "./replacement-engine";
import type {TrainingCycleSnapshot, TrainingIntentSnapshot, TrainingPlanAggregate, TrainingPlanDraft, WorkoutRunAggregate, TrainingPrescription} from "./domain/training";
import {userFamilyId} from "./exercise-family";
import {getConcreteVariationDisplay} from "./exercise-display";

export const MIN_SESSION_ACTIONS=1, MAX_SESSION_ACTIONS=10;
export function resolveVariationId(id:string){
  const exact=exerciseLibraryV1.variations.find(v=>v.id===id);
  if(exact)return exact;
  // Only the documented legacy-default alias is eligible for stable-ID resolution.
  if(!id.endsWith("--legacy-default"))return undefined;
  const owner=exerciseLibraryV1.exercises.find(e=>e.id===id.slice(0,-"--legacy-default".length));
  return exerciseLibraryV1.variations.find(v=>v.id===owner?.defaultVariationId);
}
export function newActionIntent(id:string,order:number):TrainingPlanDraft["sessions"][number]["intents"][number]{
  const variation=resolveVariationId(id);const exercise=exerciseLibraryV1.exercises.find(e=>e.id===variation?.exerciseId);
  if(!variation||!exercise)throw new Error(`无法识别动作：${id}`);
  const mode=variation.allowedMeasurementModes?.[0]??"reps";
  return {label:exercise.primaryCapacity,order,trainingRole:"optional",defaultVariationId:variation.id,explicitOptionIds:[],
    movementPattern:exercise.primaryMovementPattern??undefined,trainingGoal:exercise.trainingGoals[0],jointFunctionId:exercise.primaryJointFunctions[0]?.jointFunctionId,
    prescription:{sets:3,measurement:{version:1,types:[mode],trackLoad:variation.loadTrackingType!=="bodyweight"},
      ...(mode==="reps"?{targetReps:8}:mode==="duration"?{targetDurationSeconds:30}:{targetBreaths:5})}};
}
export function adjustedPrescription(id:string,source:TrainingPrescription|undefined,adjustment?:MeasurementAdjustment){
  const variation=resolveVariationId(id);if(!variation)throw new Error(`无法识别动作：${id}`);
  const normalized=newRunPrescription(id,source);
  if(!adjustment){if(!supportsPrescription(variation,{prescription:normalized}))throw new Error("请调整计量后替换。");return normalized;}
  if(!variation.allowedMeasurementModes?.includes(adjustment.mode)||!Number.isInteger(adjustment.target)||adjustment.target<1)throw new Error("无效的计量目标。");
  return {...normalized,measurement:{version:1 as const,types:[adjustment.mode],trackLoad:variation.loadTrackingType!=="bodyweight",side:normalized.measurement?.side},targetLoad:undefined,
    targetReps:adjustment.mode==="reps"?adjustment.target:undefined,targetDurationSeconds:adjustment.mode==="duration"?adjustment.target:undefined,targetBreaths:adjustment.mode==="breaths"?adjustment.target:undefined};
}
export function rotationCandidates(intent:TrainingIntentSnapshot,previousId:string){
  const sourceVariation=resolveVariationId(intent.defaultVariationId);const source=exerciseLibraryV1.exercises.find(e=>e.id===sourceVariation?.exerciseId);
  if(!source)return [];
  const required=intent.rotationJointFunctionIds?.length?intent.rotationJointFunctionIds:intent.jointFunctionId?[intent.jointFunctionId]:source.primaryJointFunctions.map(j=>j.jointFunctionId);
  return exerciseLibraryV1.variations.filter(v=>{
    const e=exerciseLibraryV1.exercises.find(e=>e.id===v.exerciseId);
    const explicit=Boolean(intent.rotationJointFunctionIds?.length);
    return e&&v.id!==previousId&&(explicit||userFamilyId(e)===userFamilyId(source))&&e.primaryMovementPattern===(intent.movementPattern??source.primaryMovementPattern)&&
      (!intent.trainingGoal||e.trainingGoals.includes(intent.trainingGoal))&&(explicit?required.some(j=>e.primaryJointFunctions.some(f=>f.jointFunctionId===j)):required.every(j=>e.primaryJointFunctions.some(f=>f.jointFunctionId===j)))&&supportsPrescription(v,{prescription:newRunPrescription(sourceVariation!.id,intent.prescription)});
  }).sort((a,b)=>a.id.localeCompare(b.id));
}
export function resolveCycle(plan:TrainingPlanAggregate,sessionId:string,last:WorkoutRunAggregate|null):TrainingCycleSnapshot{
  const previous=last?.sessionSnapshot.cycle;
  const nextOrder=plan.sessions.find(s=>s.id===sessionId)?.order??0;
  const wrapped=last?.status==="completed"&&nextOrder<=last.sessionSnapshot.order;
  if(previous&&!wrapped)return structuredClone(previous);
  const cycle:TrainingCycleSnapshot={id:crypto.randomUUID(),number:previous?previous.number+1:1,sessionIds:plan.sessions.map(s=>s.id),selections:{}};
  for(const session of plan.sessions){const used=new Set<string>();for(const intent of session.intents){
    const resolved=resolveVariationId(intent.defaultVariationId);if(!resolved)throw new Error(`无法识别计划动作：${intent.defaultVariationId}`);
    const prior=previous?.selections[intent.id];let selected=resolved.id;
    if(intent.trainingRole==="rotation"&&prior&&prior.defaultVariationId===intent.defaultVariationId){
      const reserved=new Set(session.intents.filter(other=>other.id!==intent.id).map(other=>resolveVariationId(other.defaultVariationId)?.exerciseId));
      const choices=rotationCandidates(intent,prior.variationId).filter(v=>!used.has(v.exerciseId)&&!reserved.has(v.exerciseId));
      if(choices.length)selected=choices[(cycle.number-2)%choices.length].id;
    }
    cycle.selections[intent.id]={variationId:selected,defaultVariationId:intent.defaultVariationId,prescription:structuredClone(newRunPrescription(selected,intent.prescription))};
    used.add(resolveVariationId(selected)!.exerciseId);
  }}return cycle;
}
export function auditPlanReferences(plans:TrainingPlanAggregate[]){return plans.map(plan=>({id:plan.id,name:plan.name,status:plan.status,
  actions:plan.sessions.flatMap(session=>session.intents.map(intent=>({session:session.name,id:intent.defaultVariationId,resolved:resolveVariationId(intent.defaultVariationId)?.id??null}))),
}));}
export const occurrenceWarmupKey=(userId:string,runId:string)=>`form-warmup-v23:${userId}:${runId}`;
export function actionSnapshot(id:string){const v=resolveVariationId(id);if(!v)throw new Error(`无法识别动作：${id}`);return {exerciseId:v.exerciseId,variationId:v.id,...getConcreteVariationDisplay(v.id)};}
export function preparedExercises(plan:TrainingPlanAggregate,sessionId:string,cycle:TrainingCycleSnapshot){
  const session=plan.sessions.find(s=>s.id===sessionId);if(!session||session.intents.length<1||session.intents.length>10)throw new Error("训练课需要 1–10 个正式动作。");
  return session.intents.map((intent,index)=>{
    const source=resolveVariationId(intent.defaultVariationId);if(!source)throw new Error(`无法识别计划动作：${intent.defaultVariationId}`);
    const choice=cycle.selections[intent.id];const selected=resolveVariationId(choice?.variationId??source.id);if(!selected)throw new Error("本轮动作已失效，请重新选择。");
    const prescription=structuredClone(choice?.prescription??newRunPrescription(selected.id,intent.prescription));
    if(!supportsPrescription(selected,{prescription}))throw new Error("本轮动作计量与处方不兼容。");
    const count=prescription.sets??1;if(!Number.isInteger(count)||count<1||count>20)throw new Error("每个动作需要 1–20 组。");
    return {sourceIntentId:intent.id,order:index,originalDefaultVariationId:intent.defaultVariationId,defaultVariationId:source.id,selectedVariationId:selected.id,
      intentSnapshot:{label:intent.label,order:index,trainingRole:intent.trainingRole,rotationJointFunctionIds:intent.rotationJointFunctionIds,movementPattern:intent.movementPattern,trainingGoal:intent.trainingGoal,jointFunctionId:intent.jointFunctionId,defaultVariationId:source.id,explicitOptionIds:intent.explicitOptionIds,prescription},
      exerciseSnapshot:actionSnapshot(selected.id),prescription};
  });
}
