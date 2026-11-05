import { exerciseLibraryV1 } from "./library-v1";
import { exerciseFamilies } from "./types";
import type { ExerciseV03 } from "./schema.v03";

/** User-facing grouping; keeps finer internal family IDs intact. */
export function userFamilyId(exercise: ExerciseV03): string {
  if (exercise.exerciseFamilyId === "squat-back-loaded" || exercise.exerciseFamilyId === "squat-front-loaded") return "squat-general";
  return exercise.exerciseFamilyId ?? `single:${exercise.id}`;
}
export function userFamilyLabel(id: string, fallback?: ExerciseV03): string {
  if (id === "squat-general") return "深蹲";
  if (id.startsWith("single:")) return fallback?.nameZh ?? "其他动作";
  return (exerciseFamilies[id as keyof typeof exerciseFamilies] ?? id).replace(/族$/, "");
}
export function exerciseFamilyGroups(exercises = exerciseLibraryV1.exercises) {
  const groups = new Map<string, typeof exercises>();
  for (const exercise of exercises) {
    const key = userFamilyId(exercise);
    groups.set(key, [...groups.get(key) ?? [], exercise]);
  }
  return [...groups].map(([id, members]) => ({
    id,
    label: userFamilyLabel(id, members[0]),
    exercises: members,
  }));
}
