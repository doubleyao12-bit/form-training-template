import type { WorkoutSetPatch } from "./domain/training";

export const PENDING_WORKOUT_KEY = "training-hub-pending-workout-v1";
export interface PendingWorkoutWrite { workoutRunId: string; setId: string; patch: WorkoutSetPatch; timestamp: string }

export function readPendingWorkoutWrites(): PendingWorkoutWrite[] {
  try { return JSON.parse(localStorage.getItem(PENDING_WORKOUT_KEY) ?? "[]") as PendingWorkoutWrite[]; }
  catch { return []; }
}
export function journalWorkoutWrite(entry: PendingWorkoutWrite) {
  const rest = readPendingWorkoutWrites().filter(item => item.setId !== entry.setId);
  localStorage.setItem(PENDING_WORKOUT_KEY, JSON.stringify([...rest, entry]));
}
export function removeWorkoutWrite(setId: string) {
  localStorage.setItem(PENDING_WORKOUT_KEY, JSON.stringify(readPendingWorkoutWrites().filter(item => item.setId !== setId)));
}

export function shouldReplayWorkoutWrite(cloudUpdatedAt: string, pendingTimestamp: string) {
  return new Date(cloudUpdatedAt).getTime() <= new Date(pendingTimestamp).getTime();
}
