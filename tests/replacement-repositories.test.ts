import assert from "node:assert/strict";
import test from "node:test";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {WorkoutRunAggregate} from "../src/domain/training";
import {SupabasePlanRepository} from "../src/data/supabase/plan-repository";
import {SupabaseWorkoutRepository} from "../src/data/supabase/workout-repository";
import {createExampleTrainingPlan} from "../src/training-playbook";
import {replacePlanIntent} from "../src/plan-edit";

const userId="test-user";
const planId="stable-plan-id";
const date="2026-10-01T00:00:00Z";
const fixture=createExampleTrainingPlan();
const squat=fixture.sessions[0].intents.find(item=>item.movementPattern==="Squat")!;
const draft={...fixture,sessions:[{...fixture.sessions[0],intents:[{...squat,order:0}]}]};

test("Plan replacement uses the existing Plan ID and reads the new default back through the repository",async()=>{
  const calls:Array<{name:string;args:Record<string,unknown>}> = [];
  const plan={id:planId,user_id:userId,status:"active",name:draft.name,updated_at:date,created_at:date,
    goal_summary:draft.goalSummary,cycle_name:draft.cycleName,cycle_focus:draft.cycleFocus,playbook_id:draft.playbookId,
    rationale:draft.rationale,planned_weeks:draft.plannedWeeks,expected_sessions_per_week:draft.expectedSessionsPerWeek,
    start_date:draft.startDate,end_date:draft.endDate};
  const session={id:"session-id",user_id:userId,plan_id:planId,name:draft.sessions[0].name,order_index:0,purpose:draft.sessions[0].purpose,
    design_notes:{warmupBlock:draft.sessions[0].warmupBlock},created_at:date,updated_at:date};
  const intent={id:"intent-id",user_id:userId,session_template_id:session.id,label:squat.label,order_index:0,movement_pattern:squat.movementPattern,
    training_goal:squat.trainingGoal,joint_function_id:squat.jointFunctionId,default_variation_id:squat.defaultVariationId,
    prescription:squat.prescription,created_at:date,updated_at:date};
  const rows:Record<string,Record<string,unknown>[]>={training_plans:[plan],session_templates:[session],training_intents:[intent],training_intent_options:[]};
  class Query {
    private filters:Array<(row:Record<string,unknown>)=>boolean>=[];
    constructor(private table:string){}
    select(){return this;}
    eq(key:string,value:unknown){this.filters.push(row=>row[key]===value);return this;}
    neq(key:string,value:unknown){this.filters.push(row=>row[key]!==value);return this;}
    is(key:string,value:unknown){this.filters.push(row=>(row[key]??null)===value);return this;}
    in(key:string,values:unknown[]){this.filters.push(row=>values.includes(row[key]));return this;}
    order(key:string){return this;}
    async maybeSingle(){return {data:rows[this.table].filter(row=>this.filters.every(fn=>fn(row)))[0]??null,error:null};}
    then(resolve:(value:{data:Record<string,unknown>[];error:null})=>unknown){return Promise.resolve({data:rows[this.table].filter(row=>this.filters.every(fn=>fn(row))),error:null}).then(resolve);}
  }
  const client={auth:{getUser:async()=>({data:{user:{id:userId}},error:null})},from:(table:string)=>new Query(table),
    rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});assert.equal(name,"form_update_training_plan_v23");
      assert.equal(args.p_plan_id,planId);const updated=args.p_draft as typeof draft;
      intent.default_variation_id=updated.sessions[0].intents[0].defaultVariationId;
      intent.prescription=updated.sessions[0].intents[0].prescription;
      plan.updated_at="2026-10-01T00:01:00Z";return {error:null};}} as unknown as SupabaseClient;
  const repo=new SupabasePlanRepository(client);
  const before=await repo.getPlan(planId);assert(before);
  const next={...draft,sessions:[{...draft.sessions[0],intents:[replacePlanIntent(draft.sessions[0].intents[0],"smith-squat--default")]}]};
  const saved=await repo.updatePlan(planId,next);
  assert.equal(saved.id,planId);
  assert.equal(saved.sessions[0].intents[0].defaultVariationId,"smith-squat--default");
  const reloaded=await repo.getPlan(planId);
  assert.equal(reloaded?.sessions[0].intents[0].defaultVariationId,"smith-squat--default");
  assert.deepEqual(calls.map(call=>call.name),["form_update_training_plan_v23"]);
});

test("Today replacement calls only Workout RPC and does not update the Plan",async()=>{
  const calls:Array<{name:string;args:Record<string,unknown>}> = [];
  const planDefault="back-squat--legacy-default";
  const client={auth:{getUser:async()=>({data:{user:{id:userId}},error:null})},
    rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return {error:null};}} as unknown as SupabaseClient;
  const repo=new SupabaseWorkoutRepository(client);
  repo.getActiveRun=async()=>({id:"run-id",userId,version:3,exercises:[{id:"workout-exercise-id",selectedVariationId:planDefault,intentSnapshot:{label:"Squat",order:0,defaultVariationId:planDefault,explicitOptionIds:[],prescription:{measurement:{version:1,types:['reps'],trackLoad:true}}}}]} as WorkoutRunAggregate);
  await repo.selectExercise("workout-exercise-id","smith-squat--default","preference");
  assert.deepEqual(calls.map(call=>call.name),["form_mutate_workout_v23"]);
  assert.equal((calls[0].args.p_payload as Record<string,unknown>).exerciseId,"workout-exercise-id");
  assert.equal((calls[0].args.p_payload as Record<string,unknown>).variationId,"smith-squat--default");
  assert.equal(calls[0].args.p_sync_plan,false);
  assert.equal(planDefault,"back-squat--legacy-default");
});
