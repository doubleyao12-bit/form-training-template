import { createExampleTrainingPlan } from "../src/training-playbook";
import { addWarmupRound, advanceWarmup, createWarmupRun, selectWarmupVariation, warmupActions } from "../src/warmup";
import { exerciseLibraryV1 } from "../src/library-v1";
import { reviewedTutorialFor } from "../src/reviewed-tutorials";
import { tutorialReviewBlockers } from "../scripts/tutorial-review-blockers";

const sessions = createExampleTrainingPlan().sessions;
const ok = (value: unknown, message: string) => { if (!value) throw new Error(message); };
export function runWarmupTests() {
  ok(sessions.length === 4, "expected A-D sessions");
  ok(new Set(sessions.map(s => s.warmupBlock?.id)).size === 4, "warm-ups must be distinct");
  for (const session of sessions) {
    const block = session.warmupBlock!;
    ok(block.version === "0.1", `${session.name}: missing warm-up config version`);
    ok(block.defaultRounds === 2, `${session.name}: expected two rounds`);
    ok(block.exercises.length <= 5, `${session.name}: too many exercises`);
    ok(block.exercises.some(e => e.warmupIntent === "hipMobility"), `${session.name}: missing hip mobility`);
  for (const item of block.exercises) {
    ok(item.replacementVariationIds.length > 0, `${item.id}: missing replacement`);
      for (const id of [item.defaultVariationId, ...item.replacementVariationIds]) {
        ok(warmupActions[id], `missing action ${id}`);
        ok(exerciseLibraryV1.variations.some(variation => variation.id === id), `${id}: missing ExerciseVariation`);
      const variation=exerciseLibraryV1.variations.find(v=>v.id===id)!;
      if(reviewedTutorialFor(variation)) {
        ok(/^https:\/\//.test(warmupActions[id].tutorialUrl) && !warmupActions[id].tutorialUrl.includes("search"), `${id}: invalid tutorial`);
      } else {
        const state=tutorialReviewBlockers[id];
        ok(state?.status==='UNREVIEWED',`${id}: missing public review state`);
        ok(state.executionSignature===[variation.exerciseId,variation.equipment.join(','),variation.loadingSymmetry,variation.loadPlacement].join('|'),`${id}: stale review signature`);
        ok(!warmupActions[id].tutorialUrl && !variation.tutorialUrl,`${id}: unreviewed warm-up URL escaped quarantine`);
      }
    }
  }
  }
  ok(sessions[0].warmupBlock!.exercises.some(e => e.warmupIntent === "breathingTrunkPelvisControl"), "A missing breathing control");
  const block = sessions[0].warmupBlock!;
  let state = selectWarmupVariation(createWarmupRun(), block.exercises[0].id, block.exercises[0].replacementVariationIds[0]);
  for (let i=0;i<block.exercises.length;i++) state = advanceWarmup(state, block);
  ok(state.round === 2 && state.index === 0 && !state.ready, "round one did not advance");
  ok(Boolean(state.selectedVariationIds[block.exercises[0].id]), "replacement was not preserved");
  for (let i=0;i<block.exercises.length;i++) state = advanceWarmup(state, block);
  ok(state.ready, "default rounds did not reach ready state");
  state = addWarmupRound(state);
  ok(state.round === 3 && !state.ready && state.index === 0, "additional round failed");
}
