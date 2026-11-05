import type { TrainingIntentSnapshot, MeasurementSnapshot } from "./domain/training";
import { exerciseLibraryV1 } from "./library-v1";
import { userFamilyId, userFamilyLabel } from "./exercise-family";
import type { ExerciseV03, ExerciseVariationV03 } from "./schema.v03";
import {newRunPrescription} from "./measurement";
import {jointFunctionVocabulary} from './types';

export interface ReplacementCandidate {
  exercise: ExerciseV03;
  variation: ExerciseVariationV03;
  score: number;
  tier: 0 | 1 | 2 | 3;
  reason: string;
}
export type MeasurementAdjustment = { mode: MeasurementSnapshot["types"][number]; target: number };

const exercises = () => new Map(exerciseLibraryV1.exercises.map(item => [item.id, item]));
export function supportsPrescription(variation: ExerciseVariationV03, intent: Pick<TrainingIntentSnapshot, "prescription"> & Partial<Pick<TrainingIntentSnapshot,"defaultVariationId">>): boolean {
  return (newRunPrescription(intent.defaultVariationId??variation.id,intent.prescription).measurement?.types??["reps"]).every(mode => variation.allowedMeasurementModes?.includes(mode));
}
export function replacementCandidates(intent: TrainingIntentSnapshot, currentId: string, selectedIds: string[] = []): ReplacementCandidate[] {
  const byId = exercises();
  const current = exerciseLibraryV1.variations.find(item => item.id === currentId);
  // Old run snapshots can retain a pre-catalog variation ID. Keep the task
  // discoverable from its stable Exercise ID without mutating that history.
  const source = byId.get(current?.exerciseId ?? currentId.split("--")[0]);
  if (!source) return [];
  const reference = current ?? exerciseLibraryV1.variations.find(item => item.id === source.defaultVariationId);
  const unavailable = new Set(selectedIds.map(id => exerciseLibraryV1.variations.find(item => item.id === id)?.exerciseId).filter(Boolean));
  const sourceFamily = userFamilyId(source);
  const sourcePattern = intent.movementPattern ?? source.primaryMovementPattern;
  return exerciseLibraryV1.variations.flatMap(variation => {
    const exercise = byId.get(variation.exerciseId);
    if (!exercise || variation.id === currentId || unavailable.has(exercise.id)) return [];
    if (intent.preparationIntent && !variation.preparationIntents?.includes(intent.preparationIntent)) return [];
    if (!supportsPrescription(variation, intent)) return [];
    const sameExercise = exercise.id === source.id;
    const sameFamily = userFamilyId(exercise) === sourceFamily;
    const samePattern = Boolean(sourcePattern && exercise.primaryMovementPattern === sourcePattern);
    const sharedJoints = exercise.primaryJointFunctions.filter(joint => source.primaryJointFunctions.some(item => item.jointFunctionId === joint.jointFunctionId)).length;
    const sharedGoals = exercise.trainingGoals.filter(goal => source.trainingGoals.includes(goal)).length;
    if (!sameExercise && !sameFamily && !(samePattern && sharedJoints > 0 && sharedGoals > 0)) return [];
    const tier: ReplacementCandidate["tier"] = sameExercise ? 0 : sameFamily ? 1 : sharedJoints > 0 && sharedGoals > 0 ? 2 : 3;
    const sharedEquipment = variation.equipment.some(item => reference?.equipment.includes(item));
    const sameLimb = exercise.limbConfiguration === source.limbConfiguration;
    const score = 100 - tier * 24 + sharedJoints * 4 + sharedGoals * 3 + (sharedEquipment ? 3 : 0) + (sameLimb ? 3 : 0) + (intent.explicitOptionIds.includes(variation.id) ? 2 : 0);
    const carryDetail=exercise.primaryMovementPattern==="Carry"?` · ${exercise.primaryJointFunctions.map(j=>jointFunctionVocabulary[j.jointFunctionId]).join(' / ')}`:"";
    const reason = (sameExercise ? "同一动作的其他执行方式" : sameFamily ? `同一${userFamilyLabel(sourceFamily, source)}动作族` :
      sharedJoints > 0 ? "相近关节功能与训练目标" : "相同动作模式与训练目标")+carryDetail;
    return [{exercise, variation, tier, score, reason}];
  }).sort((a,b) => a.tier-b.tier || b.score-a.score || a.variation.id.localeCompare(b.variation.id));
}
export function equipmentChoices(intent: TrainingIntentSnapshot, currentId: string, selectedIds: string[] = []) {
  const current = exerciseLibraryV1.variations.find(item => item.id === currentId);
  const source = exerciseLibraryV1.exercises.find(item => item.id === current?.exerciseId);
  if (!source) return [];
  const family = userFamilyId(source);
  const choices = replacementCandidates(intent, currentId, selectedIds).filter(item => userFamilyId(item.exercise) === family);
  const groups = new Map<string, ReplacementCandidate[]>();
  for (const item of choices) {
    const key = item.variation.equipment.find(equipment => !["bodyweight","squatRack","flatBench","flatBenchPress","stepPlatform","squatBox"].includes(equipment)) ?? item.variation.equipment[0] ?? "bodyweight";
    groups.set(key, [...groups.get(key) ?? [], item]);
  }
  return [...groups].map(([equipmentId, actions]) => ({equipmentId, actions}));
}
