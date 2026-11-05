import assert from "node:assert/strict";
import test from "node:test";
import { exerciseLibraryV1 } from "../src/library-v1";
import { exerciseFamilyGroups } from "../src/exercise-family";
import { equipmentChoices, replacementCandidates } from "../src/replacement-engine";
import { replacePlanIntent, validateEditablePlan } from "../src/plan-edit";
import { createExampleTrainingPlan } from "../src/training-playbook";
import { getConcreteVariationDisplay } from "../src/exercise-display";

const exercise = (id: string) => exerciseLibraryV1.exercises.find(item => item.id === id)!;
const variation = (id: string) => exerciseLibraryV1.variations.find(item => item.id === id)!;

test("V2 library has curated concrete actions for priority families without invalid equipment cross-products", () => {
  // Released e7abd6b catalog adds ten concrete actions and execution variants.
  assert.equal(exerciseLibraryV1.exercises.length, 201);
  assert.equal(exerciseLibraryV1.variations.length, 225);
  for (const [id, pattern, equipment] of [
    ["double-dumbbell-front-rack-squat", "Squat", "dumbbell"],
    ["smith-romanian-deadlift", "Hip Hinge", "smithMachine"],
    ["one-arm-dumbbell-overhead-press", "Vertical Push", "dumbbell"],
    ["machine-row", "Horizontal Pull", "rowMachine"],
    ["double-dumbbell-bulgarian-split-squat", "Squat", "dumbbell"],
    ["belt-squat", "Squat", "beltSquatMachine"],
  ] as const) {
    assert.equal(exercise(id).primaryMovementPattern, pattern, id);
    assert(variation(`${id}--default`).equipment.includes(equipment), id);
  }
  assert(!exerciseLibraryV1.exercises.some(item => item.id.includes("trap-bar-squat")));
  assert.equal(exercise("straight-arm-pulldown").primaryMovementPattern, null);
  assert.equal(exercise("straight-arm-pulldown").compoundType, "孤立");
  assert.equal(exercise("adductor-machine").primaryMuscles[0], "adductors");
  assert.equal(getConcreteVariationDisplay("standing-one-arm-landmine-press--default").nameZh,"站姿单臂地雷杠推举");
});

test("taxonomy keeps swing apart from deadlifts and gives people a simple squat group", () => {
  assert.equal(exercise("kettlebell-swing").exerciseFamilyId, "hinge-ballistic");
  const groups = exerciseFamilyGroups([exercise("back-squat"), exercise("front-squat")]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, "深蹲");
});

test("replacement ranks real family siblings, equipment, and excludes duplicate session actions", () => {
  const intent = {label:"深蹲", order:0, movementPattern:"Squat" as const, trainingGoal:"strength" as const,
    defaultVariationId:"back-squat--legacy-default", explicitOptionIds:[], prescription:{measurement:{version:1 as const,types:["reps" as const]}}};
  const choices = replacementCandidates(intent, intent.defaultVariationId);
  assert(choices.some(item => item.variation.id === "smith-squat--default"));
  assert(choices.some(item => item.variation.id === "double-dumbbell-front-rack-squat--default"));
  assert(!choices.some(item => item.variation.id === intent.defaultVariationId));
  const equipment = equipmentChoices(intent, intent.defaultVariationId).map(item => item.equipmentId);
  assert(equipment.includes("smithMachine"));
  assert(equipment.includes("dumbbell"));
  const withoutSmith = replacementCandidates(intent, intent.defaultVariationId, ["smith-squat--default"]);
  assert(!withoutSmith.some(item => item.exercise.id === "smith-squat"));
});

test("Plan replacement keeps compatible prescription and requires explicit adjustment for incompatible measurement", () => {
  const draft = createExampleTrainingPlan();
  const intentIndex = draft.sessions[0].intents.findIndex(item=>item.movementPattern==="Squat");
  assert(intentIndex>=0);
  const intent = draft.sessions[0].intents[intentIndex];
  const sibling = replacePlanIntent(intent,"smith-squat--default");
  assert.equal(sibling.defaultVariationId,"smith-squat--default");
  assert.deepEqual(sibling.prescription,intent.prescription);
  draft.sessions[0].intents[intentIndex] = sibling;
  assert.equal(validateEditablePlan(draft),null);

  const durationIntent = {...intent,prescription:{...intent.prescription,measurement:{version:1 as const,types:["duration" as const]},targetReps:undefined,targetDurationSeconds:30}};
  assert.throws(() => replacePlanIntent(durationIntent,"smith-squat--default"),/计量方式不兼容/);
  const adjusted = replacePlanIntent(durationIntent,"smith-squat--default",{mode:"reps",target:8});
  assert.equal(adjusted.prescription?.targetReps,8);
  assert.equal(adjusted.prescription?.targetDurationSeconds,undefined);
  assert.deepEqual(adjusted.prescription?.measurement?.types,["reps"]);
});

test("Today candidate selection is separate from immutable Plan default", () => {
  const plan = createExampleTrainingPlan();
  const original = structuredClone(plan);
  const current = plan.sessions[0].intents.find(item=>item.movementPattern==="Squat")!;
  const selected = replacementCandidates({...current,explicitOptionIds:current.explicitOptionIds??[]},current.defaultVariationId)
    .find(item=>item.variation.id === "smith-squat--default");
  assert(selected);
  const currentWorkoutSelection = selected.variation.id;
  assert.equal(currentWorkoutSelection,"smith-squat--default");
  assert.deepEqual(plan,original);
});
