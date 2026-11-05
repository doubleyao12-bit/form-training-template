import { exerciseLibraryV1 } from "./library-v1";
import { equipmentVocabulary } from "./types";
import type { WorkoutExercise, WorkoutRunAggregate } from './domain/training';

export function getVariationDisplay(variationId: string) {
  const variation = exerciseLibraryV1.variations.find(item => item.id === variationId);
  const exercise = variation && exerciseLibraryV1.exercises.find(item => item.id === variation.exerciseId);
  if (!variation || !exercise) return { nameZh: "动作信息缺失", nameEn: "Exercise metadata missing" };
  const generic = variation.isDefault || variation.nameZh.includes("默认执行") || variation.nameEn.includes("Default Execution");
  return {
    nameZh: generic ? exercise.nameZh : variation.nameZh,
    nameEn: generic ? exercise.nameEn : variation.nameEn,
  };
}

/** Equipment is part of the visible action name when it defines the execution. */
export function getConcreteVariationDisplay(variationId: string) {
  const base = getVariationDisplay(variationId);
  const variation = exerciseLibraryV1.variations.find(item => item.id === variationId);
  if (variation?.equipment.includes("landmine") && base.nameZh.includes("地雷杠")) return base;
  const definingEquipment = variation?.equipment.find(id => ["barbell", "dumbbell", "trapBar", "kettlebell", "cableMachine", "resistanceBand", "landmine", "safetySquatBar"].includes(id));
  if (!definingEquipment) return base;
  const label = equipmentVocabulary[definingEquipment];
  const english: Partial<Record<typeof definingEquipment, string>> = { barbell: "Barbell", dumbbell: "Dumbbell", trapBar: "Trap Bar", kettlebell: "Kettlebell", cableMachine: "Cable", resistanceBand: "Band", landmine: "Landmine", safetySquatBar: "Safety Bar" };
  return {
    nameZh: base.nameZh.includes(label) ? base.nameZh : `${label}${base.nameZh}`,
    nameEn: base.nameEn.toLowerCase().includes((english[definingEquipment] ?? "").toLowerCase()) ? base.nameEn : `${english[definingEquipment]} ${base.nameEn}`,
  };
}

export function getVariationMetadata(variationId: string) {
  return exerciseLibraryV1.variations.find(item => item.id === variationId);
}

export function getWorkoutExerciseDisplay(exercise: Pick<WorkoutExercise,'selectedVariationId'|'actualVariationId'>) {
  return getVariationDisplay(exercise.actualVariationId ?? exercise.selectedVariationId);
}

/** Presentation-only clone. Stored snapshots remain the immutable originally prepared evidence. */
export function withCurrentExerciseDisplays(run: WorkoutRunAggregate): WorkoutRunAggregate {
  return {...run,exercises:run.exercises.map(exercise=>{const display=getWorkoutExerciseDisplay(exercise);return {...exercise,exerciseSnapshot:{...exercise.exerciseSnapshot,...display}};})};
}
