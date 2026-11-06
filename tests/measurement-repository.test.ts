import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseWorkoutRepository } from "../src/data/supabase/workout-repository";
import { SupabaseHistoryRepository } from "../src/data/supabase/history-repository";
import { formatMeasuredPerformance } from "../src/measurement";

type Row=Record<string,any>;
/** Contract fixture only: this is not a substitute for live Supabase RLS. */
function transport(variationId:string){
  const tables:Record<string,Row[]>={training_plans:[{id:"plan",user_id:"user",name:"Fixture",status:"active",created_at:"now",updated_at:"now"}],session_templates:[{id:"session",user_id:"user",plan_id:"plan",name:"Fixture",order_index:0}],training_intents:[{id:"intent",user_id:"user",session_template_id:"session",label:"Fixture",order_index:0,default_variation_id:variationId,prescription:{sets:1,targetReps:5}}],training_intent_options:[],workout_runs:[],workout_exercises:[],workout_sets:[]};
  let serial=0;
  const client={auth:{async getUser(){return {data:{user:{id:"user"}},error:null};}},from(table:string){
    let mode="read",values:Row|Row[]={},one=false,head=false,limit=Infinity,sort="",asc=true;
    const filters:Array<(row:Row)=>boolean>=[];
    const q={abortSignal(signal:AbortSignal){signal.throwIfAborted();return q;},select(_columns?:string,options?:{head?:boolean}){head=Boolean(options?.head);return q;},eq(key:string,value:unknown){filters.push(row=>row[key]===value);return q;},neq(key:string,value:unknown){filters.push(row=>row[key]!==value);return q;},in(key:string,items:unknown[]){filters.push(row=>items.includes(row[key]));return q;},is(key:string,value:unknown){filters.push(row=>(row[key]??null)===value);return q;},order(key:string,options?:{ascending?:boolean}){sort=key;asc=options?.ascending!==false;return q;},limit(value:number){limit=value;return q;},single(){one=true;return q;},maybeSingle(){one=true;return q;},insert(value:Row|Row[]){mode="insert";values=value;return q;},update(value:Row){mode="update";values=value;return q;},then(resolve:(value:unknown)=>unknown,reject:(error:unknown)=>unknown){try{
      if(mode==="insert")for(const value of Array.isArray(values)?values:[values])tables[table].push({id:`id-${++serial}`,status:table==="workout_runs"?"prepared":undefined,version:1,updated_at:new Date().toISOString(),created_at:new Date().toISOString(),...value});
      let rows=tables[table].filter(row=>filters.every(filter=>filter(row)));
      if(mode==="insert")rows=tables[table].slice(-(Array.isArray(values)?values.length:1));
      if(mode==="update")for(const row of rows)Object.assign(row,values,{updated_at:new Date().toISOString()});
      if(sort)rows=rows.sort((a,b)=>String(a[sort]).localeCompare(String(b[sort]))*(asc?1:-1));
      rows=rows.slice(0,limit);
      return Promise.resolve({data:head?null:one?rows[0]??null:structuredClone(rows),error:null,count:rows.length}).then(resolve,reject);
    }catch(error){return Promise.reject(error).then(resolve,reject);}}}; return q;
  },async rpc(name:string,args:Row){
    if(name!=="form_prepare_workout_v23")throw new Error("Unexpected RPC");
    const rid=`id-${++serial}`;tables.workout_runs.push({id:rid,user_id:"user",source_plan_id:"plan",source_session_template_id:"session",status:"prepared",version:1,session_snapshot:args.p_snapshot,created_at:"now",updated_at:"now"});
    for(const entry of args.p_exercises){const eid=`id-${++serial}`;tables.workout_exercises.push({id:eid,user_id:"user",workout_run_id:rid,source_intent_id:entry.sourceIntentId,order_index:entry.order,intent_snapshot:entry.intentSnapshot,default_variation_id:entry.defaultVariationId,selected_variation_id:entry.selectedVariationId,exercise_snapshot:entry.exerciseSnapshot,status:"pending"});const p=entry.prescription;
      for(let i=0;i<(p.sets??1);i++)tables.workout_sets.push({id:`id-${++serial}`,user_id:"user",workout_exercise_id:eid,order_index:i,target_reps:p.targetReps,target_duration_seconds:p.targetDurationSeconds,target_breaths:p.targetBreaths,measurement_snapshot:p.measurement,version:1,updated_at:"now"});}
    return {data:rid,error:null};
  }} as unknown as SupabaseClient;
  return {client,tables};
}
const equal=(a:unknown,b:unknown)=>{if(a!==b)throw new Error(`${a} != ${b}`);};
export async function runRepositoryMeasurementTests(){
  for(const [variationId,key,value,expected] of [["wall-breathing","actualBreaths",6,"6 breaths"],["short-lever-copenhagen-plank--default","actualDurationSeconds",22,"22 sec / side"]] as const){
    const {client,tables}=transport(variationId);const repo=new SupabaseWorkoutRepository(client);const history=new SupabaseHistoryRepository(client);
    const prepared=await repo.prepareRun("session");equal(prepared.status,"prepared");
    await repo.startRun(prepared.id);let run=(await repo.getActiveRun())!;
    equal(run.status,"inProgress");const set=run.exercises[0].sets[0];
    await repo.updateSet(set.id,{[key]:value,completed:true,version:set.version});
    const added=await repo.addSet(run.exercises[0].id,"retry-stable-id");
    const retried=await repo.addSet(run.exercises[0].id,"retry-stable-id");
    equal(added.id,retried.id);equal(tables.workout_sets.length,2);equal(added.targetReps,undefined);
    run=(await repo.getActiveRun())!;equal(run.exercises[0].sets[0][key],value);equal(run.exercises[0].sets[0].actualReps,undefined);
    await repo.completeExercise(run.exercises[0].id);await repo.completeRun(run.id,run.version);
    const stored=(await history.getRun(run.id))!;equal(formatMeasuredPerformance(stored.exercises[0].sets[0],"bodyweight"),expected);
    const previous=(await repo.getLastPerformance(variationId))!;equal(formatMeasuredPerformance(previous.sets[0],"bodyweight"),expected);
    equal(tables.workout_sets[0].actual_reps,undefined);
    equal(tables.training_intents[0].prescription.targetReps,5); // Source plan not rewritten.
    tables.workout_runs[0].reverted_at="now";equal(await repo.getLastPerformance(variationId),null);
  }
  const {client,tables}=transport('back-squat--legacy-default');
  tables.training_intents.push({...tables.training_intents[0],id:'bad-intent',order_index:1,default_variation_id:'unknown--legacy-default'});
  let rejected=false;try{await new SupabaseWorkoutRepository(client).prepareRun('session');}catch{rejected=true;}
  equal(rejected,true);equal(tables.workout_runs.length,0);equal(tables.workout_exercises.length,0);
}
