import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExerciseDisplaySnapshot, TrainingIntentSnapshot, WorkoutExercise, WorkoutRunAggregate, WorkoutSet } from "../../domain/training";
import { valueOrUndefined } from "./helpers";

type Row = Record<string, unknown>;

function mapSet(row: Row): WorkoutSet {
  return {
    measurementSnapshot: valueOrUndefined(row.measurement_snapshot as WorkoutSet["measurementSnapshot"] | null),
    targetDurationSeconds: valueOrUndefined(row.target_duration_seconds as number | null), actualDurationSeconds: valueOrUndefined(row.actual_duration_seconds as number | null),
    targetBreaths: valueOrUndefined(row.target_breaths as number | null), actualBreaths: valueOrUndefined(row.actual_breaths as number | null),
    id: String(row.id), userId: String(row.user_id), workoutExerciseId: String(row.workout_exercise_id), order: Number(row.order_index),
    targetLoad: valueOrUndefined(row.target_load as number | null), targetReps: valueOrUndefined(row.target_reps as number | null),
    targetRPE: valueOrUndefined(row.target_rpe as number | null), targetRIR: valueOrUndefined(row.target_rir as number | null), restSeconds: valueOrUndefined(row.rest_seconds as number | null), tempo: valueOrUndefined(row.tempo as string | null),
    actualLoad: valueOrUndefined(row.actual_load as number | null), actualReps: valueOrUndefined(row.actual_reps as number | null), actualRPE: valueOrUndefined(row.actual_rpe as number | null), actualRIR: valueOrUndefined(row.actual_rir as number | null),
    completed: Boolean(row.completed), note: valueOrUndefined(row.note as string | null), version: Number(row.version), updatedAt: String(row.updated_at),
  };
}

export async function loadRunAggregate(client: SupabaseClient, run: Row): Promise<WorkoutRunAggregate> {
  const userId = String(run.user_id);
  const runId = String(run.id);
  const { data: exerciseRows, error: exerciseError } = await client.from("workout_exercises").select("*").eq("user_id", userId).eq("workout_run_id", runId).order("order_index");
  if (exerciseError) throw exerciseError;
  const ids = (exerciseRows ?? []).map(row => String(row.id));
  const { data: allSets, error: setError } = ids.length
    ? await client.from("workout_sets").select("*").eq("user_id", userId).in("workout_exercise_id", ids).order("order_index")
    : { data: [], error: null };
  if (setError) throw setError;
  const exercises: WorkoutExercise[] = [];
  for (const exerciseRow of (exerciseRows ?? []) as Row[]) {
    const exerciseId = String(exerciseRow.id);
    const setRows = (allSets ?? []).filter(row => String(row.workout_exercise_id) === exerciseId);
    exercises.push({
      id: exerciseId, userId, workoutRunId: runId, sourceIntentId: valueOrUndefined(exerciseRow.source_intent_id as string | null), order: Number(exerciseRow.order_index),
      intentSnapshot: exerciseRow.intent_snapshot as unknown as TrainingIntentSnapshot, defaultVariationId: String(exerciseRow.default_variation_id), selectedVariationId: String(exerciseRow.selected_variation_id),
      actualVariationId: valueOrUndefined(exerciseRow.actual_variation_id as string | null), replacementReason: valueOrUndefined(exerciseRow.replacement_reason as WorkoutExercise["replacementReason"] | null),
      replacementNote: valueOrUndefined(exerciseRow.replacement_note as string | null), exerciseSnapshot: exerciseRow.exercise_snapshot as unknown as ExerciseDisplaySnapshot,
      status: exerciseRow.status as WorkoutExercise["status"], sets: ((setRows ?? []) as Row[]).map(mapSet),
    });
  }
  return {
    id: runId, userId, sourcePlanId: valueOrUndefined(run.source_plan_id as string | null), sourceSessionTemplateId: valueOrUndefined(run.source_session_template_id as string | null),
    status: run.status as WorkoutRunAggregate["status"], sessionSnapshot: run.session_snapshot as unknown as WorkoutRunAggregate["sessionSnapshot"], exercises,
    startedAt: valueOrUndefined(run.started_at as string | null), completedAt: valueOrUndefined(run.completed_at as string | null),
    revertedAt: valueOrUndefined(run.reverted_at as string | null), revertReason: valueOrUndefined(run.revert_reason as WorkoutRunAggregate["revertReason"] | null),
    version: Number(run.version), createdAt: String(run.created_at), updatedAt: String(run.updated_at),
  };
}

export { mapSet };
