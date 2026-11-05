import { exerciseLibraryV1 } from "../src/library-v1";
import { createExampleTrainingPlan, examplePlaybookV01 } from "../src/training-playbook";

const plan = createExampleTrainingPlan("playbook-review-id");
const variationIds = new Set(exerciseLibraryV1.variations.map(item => item.id));
const variations = new Map(exerciseLibraryV1.variations.map(item => [item.id, item]));
const failures: string[] = [];

if (examplePlaybookV01.version !== "V0.1") failures.push("Playbook version must be V0.1.");
if (examplePlaybookV01.corePrinciples.length < 8) failures.push("Playbook principles are incomplete.");
if (plan.sessions.length !== 4) failures.push("Plan must contain exactly four sessions.");
if (plan.sessions.map(item => item.order).join(",") !== "0,1,2,3") failures.push("Session order must be A → B → C → D.");
for (const session of plan.sessions) {
  if (!session.designNotes?.primaryAdaptations.length) failures.push(`${session.name} has no Primary Adaptation.`);
  if (!session.designNotes?.rationale) failures.push(`${session.name} has no rationale.`);
  for (const trainingIntent of session.intents) {
    if (!variationIds.has(trainingIntent.defaultVariationId)) failures.push(`${session.name}: unknown variation ${trainingIntent.defaultVariationId}.`);
    const variation = variations.get(trainingIntent.defaultVariationId);
    if (!variation?.tutorialUrl || !variation.tutorialSource) failures.push(`${session.name}: tutorial missing for ${trainingIntent.defaultVariationId}.`);
  }
}
const sessionD = plan.sessions[3];
if (!sessionD.designNotes?.reviewRequired || !sessionD.designNotes.hypothesis) failures.push("Session D hypothesis must remain Review Required.");

if (failures.length) throw new Error(failures.join("\n"));
console.log(JSON.stringify({ playbook: examplePlaybookV01.version, sessions: plan.sessions.length, intents: plan.sessions.reduce((sum, item) => sum + item.intents.length, 0), sessionDReviewRequired: true, status: "passed" }, null, 2));
