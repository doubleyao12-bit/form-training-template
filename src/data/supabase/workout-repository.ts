import type { SupabaseClient } from "@supabase/supabase-js";
import { exerciseLibraryV1 } from "../../library-v1";
import type { PreviousPerformance, ReplacementReason, TrainingIntentSnapshot, WorkoutRevertReason, WorkoutRunAggregate, WorkoutRunSummary, WorkoutSetPatch } from "../../domain/training";
import type { WorkoutRepository } from "../repositories";
import { requireUserId } from "./helpers";
import { loadRunAggregate, mapSet } from "./workout-mapper";
import { getVariationDisplay } from "../../exercise-display";
import { newRunPrescription } from "../../measurement";
import {assertReplacementAvailable, validateExerciseOrder} from '../../workout-execution';
import {compatibleMeasurement} from '../../measurement-modes';
import {SupabasePlanRepository} from './plan-repository';
import {actionSnapshot, adjustedPrescription, newActionIntent, preparedExercises, resolveCycle, resolveVariationId} from '../../flexible-training';
import {resolveSessionWarmup} from '../../warmup-resolver';
import type {WorkoutChangeScope} from '../../domain/training';
import type {MeasurementAdjustment} from '../../replacement-engine';

type Row = Record<string, unknown>;
const displaySnapshot = (variation: typeof exerciseLibraryV1.variations[number], exercise: typeof exerciseLibraryV1.exercises[number]) => ({ exerciseId: exercise.id, variationId: variation.id, ...getVariationDisplay(variation.id) });

export class SupabaseWorkoutRepository implements WorkoutRepository {
  constructor(private readonly client: SupabaseClient) {}

  async prepareRun(sessionTemplateId: string) {
    const userId = await requireUserId(this.client);
    const active=await this.getActiveRun();
    if(active){if(active.sourceSessionTemplateId!==sessionTemplateId)throw new Error("请先结束当前训练。");if(!active.exercises.length)throw new Error("旧训练准备未完成，请重置后重新开始。");return active;}
    const { data: session, error: sessionError } = await this.client.from("session_templates").select("*").eq("user_id", userId).eq("id", sessionTemplateId).single();
    if (sessionError) throw sessionError;
    const plan=await new SupabasePlanRepository(this.client).getPlan(session.plan_id);if(!plan)throw new Error("计划不存在。");
    const {data:lastRow,error:lastError}=await this.client.from('workout_runs').select('*').eq('user_id',userId).eq('source_plan_id',plan.id).in('status',['completed','abandoned']).is('reverted_at',null).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(lastError)throw lastError;
    const last=lastRow?{id:lastRow.id,status:lastRow.status,sessionSnapshot:lastRow.session_snapshot} as WorkoutRunAggregate:null;
    const cycle=resolveCycle(plan,sessionTemplateId,last);const source=plan.sessions.find(s=>s.id===sessionTemplateId)!;
    const exercises=preparedExercises(plan,sessionTemplateId,cycle);
    const {data:runId,error}=await this.client.rpc('form_prepare_workout_v23',{p_session_id:sessionTemplateId,p_expected_plan_updated_at:plan.updatedAt,p_previous_run_id:last?.id??null,
      p_snapshot:{name:source.name,purpose:source.purpose,order:source.order,capturedAt:new Date().toISOString(),toleranceGuidance:source.designNotes?.toleranceGuidance,warmupBlock:resolveSessionWarmup(source),cycle},p_exercises:exercises});
    if(error)throw error;
    const {data:run,error:readError}=await this.client.from('workout_runs').select('*').eq('id',runId).eq('user_id',userId).single();if(readError)throw readError;
    return loadRunAggregate(this.client,run as Row);
  }

  async getActiveRun() {
    const userId = await requireUserId(this.client);
    const { data, error } = await this.client.from("workout_runs").select("*").eq("user_id", userId).in("status", ["prepared", "inProgress"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data ? loadRunAggregate(this.client, data as Row) : null;
  }

  async selectExercise(workoutExerciseId: string, variationId: string, reason?: ReplacementReason, note?: string, options?:{scope?:WorkoutChangeScope;adjustment?:MeasurementAdjustment}) {
    const userId = await requireUserId(this.client);
    const variation = resolveVariationId(variationId);
    const exercise = variation && exerciseLibraryV1.exercises.find(item => item.id === variation.exerciseId);
    if (!variation || !exercise) throw new Error(`Unknown variation: ${variationId}`);
    const run=await this.getActiveRun();
    if(!run||run.userId!==userId)throw new Error('没有当前训练。');
    assertReplacementAvailable(run,workoutExerciseId,variationId);
    const current=run.exercises.find(e=>e.id===workoutExerciseId)!;
    const prescription=adjustedPrescription(variation.id,current.intentSnapshot.prescription,options?.adjustment);
    await this.mutateRun(run,'replace',{exerciseId:workoutExerciseId,variationId:variation.id,snapshot:actionSnapshot(variation.id),prescription,adjustMeasurement:Boolean(options?.adjustment),reason:reason??null,note:note??null},options?.scope);
  }

  private async mutateRun(run:WorkoutRunAggregate,action:'add'|'remove'|'replace',payload:Record<string,unknown>,scope:WorkoutChangeScope='workout'){
    const plan=scope==='plan'&&run.sourcePlanId?await new SupabasePlanRepository(this.client).getPlan(run.sourcePlanId):null;
    if(scope==='plan'&&!plan)throw new Error('原计划不可用，请选择仅本次训练。');
    const {error}=await this.client.rpc('form_mutate_workout_v23',{p_run_id:run.id,p_expected_version:run.version,p_action:action,p_payload:payload,p_sync_plan:scope==='plan',p_expected_plan_updated_at:plan?.updatedAt??null});if(error)throw error;
  }
  async addExercise(runId:string,variationId:string,scope:WorkoutChangeScope='workout'){
    const run=await this.getActiveRun();if(!run||run.id!==runId)throw new Error('没有当前训练。');
    if(run.exercises.length>=10)throw new Error('本次训练最多 10 个正式动作。');
    const intent=newActionIntent(variationId,run.exercises.length);
    if(run.exercises.some(e=>e.exerciseSnapshot.exerciseId===resolveVariationId(variationId)?.exerciseId))throw new Error('动作已存在。');
    await this.mutateRun(run,'add',{variationId:intent.defaultVariationId,snapshot:actionSnapshot(intent.defaultVariationId),intent},scope);
    return (await this.getActiveRun())!;
  }
  async removeExercise(exerciseId:string,scope:WorkoutChangeScope='workout'){
    const run=await this.getActiveRun();const exercise=run?.exercises.find(e=>e.id===exerciseId);
    if(!run||!exercise)throw new Error('没有当前动作。');
    if(exercise.status==='completed'||exercise.sets.some(s=>s.completed))throw new Error('已完成动作或组不能直接删除。');
    if(run.exercises.length<=1)throw new Error('至少保留 1 个正式动作。');
    await this.mutateRun(run,'remove',{exerciseId},scope);return (await this.getActiveRun())!;
  }

  async startRun(runId: string) {
    const userId = await requireUserId(this.client);
    const { error } = await this.client.from("workout_runs").update({ status: "inProgress", started_at: new Date().toISOString() }).eq("user_id", userId).eq("id", runId).eq("status", "prepared");
    if (error) throw error;
  }

  async reorderExercises(runId:string,ids:string[],expectedVersion:number){
    const run=await this.getActiveRun();
    if(!run||run.id!==runId)throw new Error('没有当前训练。');
    validateExerciseOrder(run,ids);
    const {error}=await this.client.rpc('reorder_training_hub_exercises',{p_run_id:runId,p_expected_version:expectedVersion,p_exercise_ids:ids});
    if(error)throw error;
    const updated=await this.getActiveRun();
    if(!updated||updated.id!==runId)throw new Error('训练已改变，请重新读取。');
    return updated;
  }

  async updateSet(setId: string, patch: WorkoutSetPatch) {
    const userId = await requireUserId(this.client);
    const { version, ...values } = patch;
    if(values.measurementSnapshot){
      const {data:row,error}=await this.client.from('workout_sets').select('*,workout_exercises(selected_variation_id)').eq('user_id',userId).eq('id',setId).single();
      if(error)throw error;
      const variation=exerciseLibraryV1.variations.find(v=>v.id===row.workout_exercises?.selected_variation_id);
      if(!compatibleMeasurement(row.measurement_snapshot??undefined,values.measurementSnapshot)){
        if(row.completed)throw new Error('已完成组不能切换计量方式。');
        if(values.measurementSnapshot.types.length!==1||!variation?.allowedMeasurementModes?.includes(values.measurementSnapshot.types[0]))throw new Error('此动作不支持所选计量方式。');
      }
    }
    const { data, error } = await this.client.from("workout_sets").update({
      actual_load: values.actualLoad, actual_reps: values.actualReps, actual_rpe: values.actualRPE, actual_rir: values.actualRIR,
      actual_duration_seconds: values.actualDurationSeconds, actual_breaths: values.actualBreaths,
      ...(values.measurementSnapshot?{measurement_snapshot:values.measurementSnapshot}:{}),
      completed: values.completed, note: values.note, version: version + 1,
    }).eq("user_id", userId).eq("id", setId).eq("version", version).select("*").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Workout set changed elsewhere. Reload before retrying.");
    return mapSet(data as Row);
  }

  async addSet(workoutExerciseId: string, id?: string) {
    const userId = await requireUserId(this.client);
    if (id) {
      const { data: existing, error } = await this.client.from("workout_sets").select("*").eq("user_id", userId).eq("workout_exercise_id", workoutExerciseId).eq("id", id).maybeSingle();
      if (error) throw error;
      if (existing) return mapSet(existing as Row);
    }
    const { data: rows, error: readError } = await this.client.from("workout_sets").select("*").eq("user_id", userId).eq("workout_exercise_id", workoutExerciseId).order("order_index", { ascending: false }).limit(1);
    if (readError) throw readError;
    const previous = rows?.[0] as Row | undefined;
    const { data, error } = await this.client.from("workout_sets").insert({
      id,
      user_id: userId, workout_exercise_id: workoutExerciseId,
      order_index: previous ? Number(previous.order_index) + 1 : 0,
      target_load: previous?.target_load, target_reps: previous ? previous.target_reps : 8,
      target_duration_seconds: previous?.target_duration_seconds, target_breaths: previous?.target_breaths, measurement_snapshot: previous?.measurement_snapshot,
      target_rpe: previous?.target_rpe ?? 7, target_rir: previous?.target_rir,
      rest_seconds: previous?.rest_seconds ?? 90, tempo: previous?.tempo,
    }).select("*").single();
    if (error) throw error;
    return mapSet(data as Row);
  }

  async deleteSet(setId: string) {
    const userId = await requireUserId(this.client);
    const { error } = await this.client.from("workout_sets").delete().eq("user_id", userId).eq("id", setId);
    if (error) throw error;
  }

  async completeExercise(workoutExerciseId: string) {
    const userId = await requireUserId(this.client);
    const { data: exercise, error: readError } = await this.client.from("workout_exercises").select("selected_variation_id").eq("user_id", userId).eq("id", workoutExerciseId).single();
    if (readError) throw readError;
    const { error } = await this.client.from("workout_exercises").update({ status: "completed", actual_variation_id: exercise.selected_variation_id }).eq("user_id", userId).eq("id", workoutExerciseId);
    if (error) throw error;
  }

  async getLastPerformance(variationId: string, measurement?: import('../../domain/training').MeasurementSnapshot): Promise<PreviousPerformance | null> {
    const userId = await requireUserId(this.client);
    const { data: runs, error: runError } = await this.client.from("workout_runs").select("id,completed_at").eq("user_id", userId).eq("status", "completed").is("reverted_at", null).order("completed_at", { ascending: false }).limit(30);
    if (runError) throw runError;
    if (!runs?.length) return null;
    const { data: exercises, error: exerciseError } = await this.client.from("workout_exercises").select("id,workout_run_id").eq("user_id", userId).in("workout_run_id", runs.map(run => run.id)).eq("actual_variation_id", variationId);
    if (exerciseError) throw exerciseError;
    const {data:allSets,error:setsError}=exercises?.length?await this.client.from('workout_sets').select('*').eq('user_id',userId).in('workout_exercise_id',exercises.map(e=>e.id)).eq('completed',true).order('order_index'):{data:[],error:null};
    if(setsError)throw setsError;
    for (const run of runs) {
      const exercise = exercises?.find(item => item.workout_run_id === run.id);
      if (!exercise) continue;
      const sets=(allSets??[]).filter(s=>s.workout_exercise_id===exercise.id).map(set=>mapSet(set as Row)).filter(s=>!measurement||compatibleMeasurement(s.measurementSnapshot,measurement));
      if(sets.length)return {completedAt:run.completed_at,sets};
    }
    return null;
  }

  async completeRun(runId: string, expectedVersion: number) {
    const userId = await requireUserId(this.client);
    const { count, error: pendingError } = await this.client.from("workout_exercises").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("workout_run_id", runId).in("status", ["pending", "inProgress"]);
    if (pendingError) throw pendingError;
    if (count) throw new Error("Complete every exercise before finishing the workout.");
    const { data, error } = await this.client.from("workout_runs").update({ status: "completed", completed_at: new Date().toISOString(), version: expectedVersion + 1 }).eq("user_id", userId).eq("id", runId).eq("version", expectedVersion).in("status", ["prepared", "inProgress"]).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Workout changed elsewhere. Reload before finishing.");
  }

  async abandonRun(runId: string, expectedVersion: number) {
    const userId = await requireUserId(this.client);
    const { data, error } = await this.client.from("workout_runs")
      .update({ status: "abandoned", version: expectedVersion + 1 })
      .eq("user_id", userId)
      .eq("id", runId)
      .eq("version", expectedVersion)
      .in("status", ["prepared", "inProgress"])
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Workout changed elsewhere. Reload before abandoning.");
  }

  async revertLastCompletedRun(runId: string, reason: WorkoutRevertReason, expectedVersion: number): Promise<WorkoutRunSummary> {
    const { data, error } = await this.client.rpc("revert_latest_training_hub_workout", { p_workout_id: runId, p_expected_version: expectedVersion, p_reason: reason }).single();
    if (error) throw error;
    const row = data as Record<string, unknown>;
    return {
      id: String(row.id), userId: String(row.user_id), sourcePlanId: row.source_plan_id ? String(row.source_plan_id) : undefined,
      sourceSessionTemplateId: row.source_session_template_id ? String(row.source_session_template_id) : undefined,
      status: "completed", sessionSnapshot: row.session_snapshot as WorkoutRunAggregate["sessionSnapshot"], startedAt: row.started_at ? String(row.started_at) : undefined,
      completedAt: row.completed_at ? String(row.completed_at) : undefined, revertedAt: String(row.reverted_at), revertReason: row.revert_reason as WorkoutRevertReason,
      version: Number(row.version), createdAt: String(row.created_at), updatedAt: String(row.updated_at), exerciseCount: Number(row.exercise_count),
    };
  }
}
