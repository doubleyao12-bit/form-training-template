import { seedExercises as v02 } from "../src/data.v3";
import { exerciseLibraryV03 as library } from "../src/data.v4";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const exercisesById = new Map(library.exercises.map(exercise => [exercise.id, exercise]));
const variationsById = new Map(library.variations.map(variation => [variation.id, variation]));
const v02ById = new Map(v02.map(exercise => [exercise.id, exercise]));

invariant(library.schemaVersion === "0.3", "Library schemaVersion must be 0.3");
invariant(library.exercises.length === v02.length, "Exercise count changed during migration");
invariant(library.variations.length === v02.length, "Every V0.2 Exercise must produce one default Variation");
invariant(exercisesById.size === library.exercises.length, "Exercise IDs must be unique");
invariant(variationsById.size === library.variations.length, "Variation IDs must be unique");

for (const exercise of library.exercises) {
  const source = v02ById.get(exercise.id);
  invariant(source, `Missing V0.2 source for ${exercise.id}`);
  const variation = variationsById.get(exercise.defaultVariationId);
  invariant(variation, `Missing default Variation for ${exercise.id}`);
  invariant(variation.exerciseId === exercise.id, `Default Variation points to wrong Exercise: ${exercise.id}`);
  invariant(variation.isDefault, `Default Variation is not marked default: ${exercise.id}`);
  invariant(JSON.stringify(variation.equipment) === JSON.stringify(source.equipment), `Equipment changed: ${exercise.id}`);
  invariant(variation.loadingSymmetry === source.loadingSymmetry, `Loading symmetry changed: ${exercise.id}`);
  invariant(variation.stabilityDemand === source.stabilityDemand, `Stability demand changed: ${exercise.id}`);
  invariant(exercise.limbConfiguration === source.limbConfiguration, `Limb configuration changed: ${exercise.id}`);
  invariant(exercise.movementPlane === source.movementPlane, `Movement plane changed: ${exercise.id}`);
  invariant(exercise.loadability === source.loadability, `Loadability changed: ${exercise.id}`);
  invariant(exercise.technicalComplexity === source.technicalComplexity, `Technical complexity changed: ${exercise.id}`);
  invariant(exercise.impactLevel === source.impactLevel, `Impact level changed: ${exercise.id}`);
  invariant(exercise.systemicFatiguePotential === source.systemicFatiguePotential, `Fatigue potential changed: ${exercise.id}`);
  invariant(exercise.primaryCapacity === source.primaryCapacity, `Primary capacity changed: ${exercise.id}`);
  invariant(exercise.primaryJointFunctions.length === source.primaryJointFunctions.length, `Primary joint functions lost: ${exercise.id}`);
  invariant(exercise.secondaryJointFunctions.length === source.secondaryJointFunctions.length, `Secondary joint functions lost: ${exercise.id}`);
  invariant(exercise.primaryJointFunctions.every((item, index) => item.jointFunctionId === source.primaryJointFunctions[index]), `Primary joint function IDs changed: ${exercise.id}`);
  invariant(exercise.secondaryJointFunctions.every((item, index) => item.jointFunctionId === source.secondaryJointFunctions[index]), `Secondary joint function IDs changed: ${exercise.id}`);
  for (const relation of exercise.relations) {
    if (relation.status === "resolved") invariant(relation.targetExerciseId && exercisesById.has(relation.targetExerciseId), `Broken resolved relation: ${exercise.id}`);
    if (relation.type === "sameFamily" && relation.targetExerciseId) {
      const target = exercisesById.get(relation.targetExerciseId);
      invariant(!target || !exercise.exerciseFamilyId || target.exerciseFamilyId !== exercise.exerciseFamilyId, `Redundant sameFamily relation: ${exercise.id}`);
    }
  }
}

for (const variation of library.variations) invariant(exercisesById.has(variation.exerciseId), `Orphan Variation: ${variation.id}`);

const formal = library.exercises.filter(exercise => exercise.primaryMovementPattern === "Squat" || exercise.primaryMovementPattern === "Hip Hinge");
invariant(formal.length === 26, "Expected 26 formal Squat/Hip Hinge exercises");
invariant(formal.every(exercise => exercise.exerciseFamilyId), "Every formal Exercise must have a family");

const disputedIds = ["barbell-hip-thrust", "glute-bridge", "trap-bar-deadlift", "step-down", "lateral-lunge", "forward-lunge", "walking-lunge", "box-squat"];
for (const id of disputedIds) invariant(exercisesById.get(id)?.reviewFlags.some(flag => flag.code === "movementPatternClassification"), `Missing preserved Review Required: ${id}`);

console.log(JSON.stringify({
  schemaVersion: library.schemaVersion,
  sourceExercises: v02.length,
  migratedExercises: library.exercises.length,
  formalExercises: formal.length,
  variations: library.variations.length,
  migratedRelations: library.exercises.reduce((sum, exercise) => sum + exercise.relations.length, 0),
  removedRedundantSameFamily: library.migrationReport.removedRelations.length,
  reviewFlaggedExercises: library.exercises.filter(exercise => exercise.reviewFlags.length > 0).length,
  status: "passed",
}, null, 2));
