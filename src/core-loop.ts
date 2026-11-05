import type { SessionTemplate, WorkoutRunAggregate } from "./domain/training";

export function resolveNextSession(
  sessions: SessionTemplate[],
  completedRuns: Array<Pick<WorkoutRunAggregate, "sourceSessionTemplateId" | "completedAt" | "revertedAt">>,
) {
  const ordered = [...sessions].sort((a, b) => a.order - b.order);
  if (!ordered.length) return null;
  const sessionIds = new Set(ordered.map(session => session.id));
  const latest = [...completedRuns]
    .filter(run => run.sourceSessionTemplateId && sessionIds.has(run.sourceSessionTemplateId) && run.completedAt && !run.revertedAt)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))[0];
  if (!latest?.sourceSessionTemplateId) return ordered[0];
  const index = ordered.findIndex(session => session.id === latest.sourceSessionTemplateId);
  return ordered[(index + 1) % ordered.length];
}

export function nextPendingExercise(run: WorkoutRunAggregate) {
  return run.exercises.find(exercise => exercise.status !== "completed" && exercise.status !== "skipped") ?? null;
}

export function canFinishWorkout(run: WorkoutRunAggregate) {
  return run.exercises.length > 0 && run.exercises.every(exercise => exercise.status === "completed" || exercise.status === "skipped");
}
