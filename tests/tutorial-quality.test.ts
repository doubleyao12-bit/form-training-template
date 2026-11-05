import assert from 'node:assert/strict';
import test from 'node:test';
import { exerciseLibraryV1 } from '../src/library-v1';
import { reviewedTutorialFor } from '../src/reviewed-tutorials';
import { getVariationMetadata } from '../src/exercise-display';
import { releaseTutorialDebt } from '../scripts/tutorial-release-debt';
import { tutorialReviewBlockers } from '../scripts/tutorial-review-blockers';
import { knowledgeExpansionExerciseTutorials } from '../src/knowledge-expansion-tutorials';
import { createExampleTrainingPlan } from '../src/training-playbook';
const get = (id: string) => {
  const v = exerciseLibraryV1.variations.find(v => v.id === id);
  assert.ok(v, id); return v;
};
const signature = (v: ReturnType<typeof get>) => [v.exerciseId,v.equipment.join(','),v.loadingSymmetry,v.loadPlacement].join('|');
test('narrowed legacy equipment has individually matched tutorials, with no broader inheritance', () => {
  for (const [id, equipment] of [['goblet-squat--legacy-default','dumbbell'],['pallof-press--legacy-default','cableMachine']]) {
    const v=get(id); assert.deepEqual(v.equipment,[equipment]);
    assert.ok(reviewedTutorialFor(v));
    assert.equal(v.tutorialUrl,reviewedTutorialFor(v)?.tutorialUrl);
    assert.equal(reviewedTutorialFor({...v,id:v.id+'-future'}),undefined);
    assert.equal(reviewedTutorialFor({...v,equipment:['bodyweight']}),undefined);
    assert.equal(reviewedTutorialFor({...v,loadPlacement:'frontRack'}),undefined);
  }
});
test('release debt retains all 81 exact execution signatures without research content', () => {
  assert.equal(Object.keys(releaseTutorialDebt).length,81);
  for(const [id,state] of Object.entries(releaseTutorialDebt)) {
    const v=get(id);
    assert.equal(state.status,'UNREVIEWED');
    assert.equal(state.executionSignature,signature(v),id);
    assert.deepEqual(Object.keys(state).sort(),['executionSignature','status']);
    assert.deepEqual(state,tutorialReviewBlockers[id]);
    assert.equal(reviewedTutorialFor(v),undefined,id);
    assert.equal(v.tutorialUrl,undefined,id);
    assert.equal(v.tutorialSource,undefined,id);
    assert.equal(getVariationMetadata(id)?.tutorialUrl,undefined,id);
  }
});
test('every missing tutorial has an exact public state, no research fields and no stale state', () => {
  const missing=exerciseLibraryV1.variations.filter(v=>!reviewedTutorialFor(v));
  assert.equal(missing.length,Object.keys(tutorialReviewBlockers).length);
  assert.equal(missing.length + exerciseLibraryV1.variations.filter(v=>reviewedTutorialFor(v)).length,exerciseLibraryV1.variations.length);
  for(const v of missing) {
    const state=tutorialReviewBlockers[v.id]; assert.ok(state,v.id);
    assert.equal(state.status,'UNREVIEWED');
    assert.equal(state.executionSignature,signature(v),v.id);
    assert.deepEqual(Object.keys(state).sort(),['executionSignature','status']);
    assert.equal(reviewedTutorialFor({...v,id:v.id+'-unreviewed-future'}),undefined);
    assert.equal(getVariationMetadata(v.id)?.tutorialUrl,undefined);
  }
  const ids=new Set(missing.map(v=>v.id));
  for(const id of Object.keys(tutorialReviewBlockers)) assert.ok(ids.has(id),`Stale blocker: ${id}`);
});
test('optional sample uses identified reviewed replacements, original actions remain in the library', () => {
  const plan=createExampleTrainingPlan(); const d=plan.sessions[3];
  assert.equal(plan.sessions.length,4);
  assert.equal(d.intents[0].defaultVariationId,'medicine-ball-chest-pass--default');
  assert.equal(d.intents[0].movementPattern,'Throw / Ballistic');
  assert.equal(d.intents[3].defaultVariationId,'lateral-bound--legacy-default');
  assert.equal(d.intents[3].movementPattern,'Jump / Landing');
  assert.ok(d.intents.some(i=>i.defaultVariationId==='cable-chop--default'));
  for(const session of plan.sessions) for(const i of session.intents) assert.ok(get(i.defaultVariationId).tutorialUrl,i.defaultVariationId);
  for(const id of ['medicine-ball-rotational-throw--default','lateral-cut-stick--default']) {
    assert.ok(get(id)); assert.equal(get(id).tutorialUrl,undefined);
    assert.ok(tutorialReviewBlockers[id]);
  }
});

test('arm bar keeps its technical identity but exposes no admitted or candidate tutorial', () => {
  const v=get('kettlebell-arm-bar--default');
  assert.equal(v.exerciseId,'kettlebell-arm-bar');
  assert.deepEqual(v.equipment,['kettlebell']);
  assert.equal(signature(v),'kettlebell-arm-bar|kettlebell|unilateral|ipsilateral');
  assert.deepEqual(tutorialReviewBlockers[v.id],{status:'UNREVIEWED',executionSignature:signature(v)});
  assert.equal(knowledgeExpansionExerciseTutorials[v.exerciseId],undefined);
  assert.equal(reviewedTutorialFor(v),undefined);
  assert.equal(v.tutorialUrl,undefined);
  assert.equal(v.tutorialSource,undefined);
  assert.equal(getVariationMetadata(v.id)?.tutorialUrl,undefined);
  assert.equal(reviewedTutorialFor({...v,id:v.id+'-future'}),undefined);
});
