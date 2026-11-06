import type { WorkoutSetPatch } from "./domain/training";

export const PENDING_WORKOUT_KEY = "training-hub-pending-workout-v1";
export interface PendingWorkoutWrite { workoutRunId: string; setId: string; patch: WorkoutSetPatch; timestamp: string; revision?: string; userId?: string; base?: WorkoutSetPatch; sent?: WorkoutSetPatch }

export function readPendingWorkoutWrites(): PendingWorkoutWrite[] {
  const value: unknown = JSON.parse(localStorage.getItem(PENDING_WORKOUT_KEY) ?? "[]");
  if (!Array.isArray(value) || value.some(item => !item || typeof item.setId !== 'string' || typeof item.workoutRunId !== 'string' || !item.patch)) throw new Error('本机保存队列损坏；原始内容仍保留，请先导出，不能继续自动保存。');
  return value as PendingWorkoutWrite[];
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
