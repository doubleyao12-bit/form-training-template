import type { SupabaseClient } from "@supabase/supabase-js";
import { newRunPrescription, formatMeasuredPerformance } from "../src/measurement";
import { aggregateSaveState } from "../src/save-state";
import { loadRunAggregate, mapSet } from "../src/data/supabase/workout-mapper";
import { rankSubstitutions } from "../src/substitution";
import { requireUserId } from "../src/data/supabase/helpers";

const equal = (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
export async function runMeasurementTests() {
  const old = { id:"s", user_id:"u", workout_exercise_id:"e", order_index:0, target_reps:8, actual_load:80, actual_reps:5, completed:true, version:1, updated_at:"now" };
  const legacy = mapSet(old);
  equal(legacy.measurementSnapshot, undefined);
  equal(formatMeasuredPerformance(legacy,"externalLoad"), "80 kg × 5");
  equal(old.actual_reps,5);
  const hold = newRunPrescription("short-lever-copenhagen-plank--default",{sets:3,targetReps:20});
  equal(hold.targetReps,undefined); equal(hold.targetDurationSeconds,20);
  const holdSet = mapSet({...old,actual_reps:null,measurement_snapshot:hold.measurement,actual_duration_seconds:22,target_duration_seconds:20});
  equal(formatMeasuredPerformance(holdSet,"bodyweight"),"22 sec / side");
  const breathing = newRunPrescription("wall-breathing",{targetReps:5});
  equal(breathing.targetBreaths,5); equal(breathing.targetReps,undefined);
  equal(formatMeasuredPerformance({measurementSnapshot:breathing.measurement,actualBreaths:6},"bodyweight"),"6 breaths");
  equal(newRunPrescription("anything",{targetReps:8}).targetReps,8);
  equal(formatMeasuredPerformance({measurementSnapshot:{version:1,types:["duration","breaths"],trackLoad:false},actualDurationSeconds:30,actualBreaths:5},"externalLoad"),"30 sec · 5 breaths");
  equal(aggregateSaveState(2,0),"Saving"); equal(aggregateSaveState(1,1),"Retry"); equal(aggregateSaveState(0,1),"Retry"); equal(aggregateSaveState(0,0),"Saved");
  const candidates = rankSubstitutions({label:"Hinge",order:0,preparationIntent:"hingePatternPreparation",movementPattern:"Hip Hinge",trainingGoal:"motorControl",defaultVariationId:"bodyweight-hip-hinge",explicitOptionIds:["glute-bridge-prep"]},"bodyweight-hip-hinge",5,["romanian-deadlift--legacy-default"]);
  equal(candidates.length,0); // No invented preparation exercise to fill a shortlist.
  if (candidates.some(item => item.exercise.primaryMovementPattern !== "Hip Hinge" || item.variation.id === "bodyweight-hinge" || item.variation.id === "glute-bridge-prep" || item.exercise.id === "romanian-deadlift")) throw new Error("Invalid recommendation");
  // Fake transport counts the actual mapper queries, not a hand-written estimate.
  let queries=0;
  const client = {from(table:string) { queries++; const rows = table === "workout_exercises" ? Array.from({length:5},(_,i)=>({id:`e${i}`,workout_run_id:"r",user_id:"u",order_index:i,intent_snapshot:{},default_variation_id:"v",selected_variation_id:"v",exercise_snapshot:{},status:"pending"})) : Array.from({length:5},(_,i)=>({...old,workout_exercise_id:`e${i}`})); const builder = {select(){return builder;},eq(){return builder;},in(){return builder;},order(){return Promise.resolve({data:rows,error:null});}}; return builder; }} as unknown as SupabaseClient;
  const run=await loadRunAggregate(client,{id:"r",user_id:"u",status:"prepared",session_snapshot:{},version:1});
  equal(queries,2); equal(run.exercises.map(item=>item.sets.length),[1,1,1,1,1]);
  let authQueries=0;
  const authClient={auth:{async getUser(){authQueries++;await Promise.resolve();return {data:{user:{id:"u"}},error:null};}}} as unknown as SupabaseClient;
  equal(await Promise.all([requireUserId(authClient),requireUserId(authClient),requireUserId(authClient)]),["u","u","u"]);equal(authQueries,1);
  await requireUserId(authClient); equal(authQueries,2);
  console.log("mapper queries: 6 → 2 for 5 exercises; parallel Auth checks: 3 → 1 (fake transport)");
}
