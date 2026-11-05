import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveCycle,preparedExercises,newActionIntent,resolveVariationId,occurrenceWarmupKey,rotationCandidates} from '../src/flexible-training';
import {validateEditablePlan,draftFromPlan} from '../src/plan-edit';
import {replacementCandidates,supportsPrescription} from '../src/replacement-engine';
import {matchesAction} from '../src/catalog-search';
import {parseAndValidatePlanImport} from '../src/plan-import';
import type {TrainingPlanAggregate,WorkoutRunAggregate} from '../src/domain/training';
import {exerciseLibraryV1} from '../src/library-v1';
import {readWarmupProgress} from '../src/warmup-occurrence';

const ids=['back-squat--legacy-default','romanian-deadlift--legacy-default','pallof-press--legacy-default','farmers-carry--default','pull-up--default','push-up--default','barbell-overhead-press--default','side-plank--default','goblet-squat--legacy-default','box-jump--default'];
function plan(count=5):TrainingPlanAggregate{return {id:'plan',userId:'user',name:'Synthetic',status:'active',createdAt:'',updatedAt:'revision',sessions:[{id:'a',planId:'plan',userId:'user',name:'A',order:0,createdAt:'',updatedAt:'',intents:ids.slice(0,count).map((id,index)=>({...newActionIntent(id,index),id:`intent-${index}`,sessionTemplateId:'a',userId:'user',explicitOptionIds:[],createdAt:'',updatedAt:''}))},{id:'b',planId:'plan',userId:'user',name:'B',order:1,intents:[{...newActionIntent(ids[1],0),id:'b-0',sessionTemplateId:'b',userId:'user',explicitOptionIds:[],createdAt:'',updatedAt:''}],createdAt:'',updatedAt:''}]};}
test('Session accepts 3/4/5/6/8 actions and rejects 0/11; import uses the same 1–10 boundary',()=>{
  for(const count of [3,4,5,6,8]){const p=plan(count);assert.equal(validateEditablePlan(draftFromPlan(p)),null);const c=resolveCycle(p,'a',null);assert.equal(preparedExercises(p,'a',c).length,count);
    const result=parseAndValidatePlanImport(JSON.stringify({version:'form.plan-import.v1',plan:{name:'test',sessions:[{order:0,title:'test',warmupProfile:'A',exercises:ids.slice(0,count).map((id,order)=>{const v=resolveVariationId(id)!;const mode=v.allowedMeasurementModes![0];return {order,exercise:id,measurement:mode,sets:2,...(mode==='duration'?{durationSeconds:30}:{reps:8})};})}]}}));assert(result.ok);}
  const empty=plan(0);assert(validateEditablePlan(draftFromPlan(empty)));
  const excess=plan(10);excess.sessions[0].intents.push({...excess.sessions[0].intents[0],order:10});assert(validateEditablePlan(draftFromPlan(excess)));
});
test('Cycle freezes choices, anchors and legacy defaults; rotation preserves anti-rotation intent',()=>{
  const p=plan(3);p.sessions[0].intents[0].trainingRole='anchor';p.sessions[0].intents[2].trainingRole='rotation';
  const original=structuredClone(p);const first=resolveCycle(p,'a',null);
  const last={id:'run',status:'completed',sessionSnapshot:{name:'A',order:0,capturedAt:'',cycle:first}} as WorkoutRunAggregate;
  assert.deepEqual(resolveCycle(p,'b',last),first);
  const next=resolveCycle(p,'a',{...last,sessionSnapshot:{...last.sessionSnapshot,order:1}});
  assert.equal(next.number,2);assert.equal(next.selections['intent-0'].variationId,p.sessions[0].intents[0].defaultVariationId);
  const choices=rotationCandidates(p.sessions[0].intents[2],ids[2]);assert(choices.length);
  assert(choices.every(v=>exerciseLibraryV1.exercises.find(e=>e.id===v.exerciseId)!.primaryJointFunctions.some(j=>j.jointFunctionId==='trunkAntiRotation')));
  assert(!choices.some(v=>v.id.includes('wood-chop')));assert.deepEqual(p,original);
});
test('New future default takes effect on next cycle without rewriting the previous snapshot',()=>{
  const p=plan(3);p.sessions[0].intents[0].trainingRole='rotation';const first=resolveCycle(p,'a',null);const before=structuredClone(first);
  p.sessions[0].intents[0].defaultVariationId='smith-squat--default';
  const last={id:'run',status:'completed',sessionSnapshot:{name:'B',order:1,capturedAt:'',cycle:first}} as WorkoutRunAggregate;
  assert.equal(resolveCycle(p,'a',last).selections['intent-0'].variationId,'smith-squat--default');assert.deepEqual(first,before);
});
test('Farmer Carry uses duration-compatible clickable choices, including suitcase/front-rack/overhead',()=>{
  const source={label:'Carry',order:0,defaultVariationId:'farmers-carry--default',explicitOptionIds:[],movementPattern:'Carry' as const};
  const candidates=replacementCandidates(source,source.defaultVariationId,[]);
  for(const id of ['suitcase-carry--default','front-rack-carry--default','overhead-carry--default']){assert(candidates.some(c=>c.variation.id===id),id);assert(supportsPrescription(resolveVariationId(id)!,source));}
});
test('Search resolves Chinese, English, equipment and family without traversal',()=>{
  assert(matchesAction('romanian-deadlift--legacy-default','罗马尼亚'));assert(matchesAction('romanian-deadlift--legacy-default','Romanian'));assert(matchesAction('smith-squat--default','史密斯'));assert(matchesAction('back-squat--legacy-default','深蹲'));assert(!matchesAction('back-squat--legacy-default','不存在的动作'));
});
test('Occurrence warm-up storage isolates runs, and legacy IDs prepare all actions before any write',()=>{
  assert.notEqual(occurrenceWarmupKey('u','run-1'),occurrenceWarmupKey('u','run-2'));
  const data=new Map([[occurrenceWarmupKey('u','run-1'),JSON.stringify({completedIds:['warmup-1'],selectedVariationIds:{}})]]);const storage={getItem:(key:string)=>data.get(key)??null};
  assert.deepEqual(readWarmupProgress(storage,occurrenceWarmupKey('u','run-1')).completedIds,['warmup-1']);
  assert.deepEqual(readWarmupProgress(storage,occurrenceWarmupKey('u','run-2')).completedIds,[]);
  const p=plan();assert(preparedExercises(p,'a',resolveCycle(p,'a',null)).every(e=>e.prescription.measurement));
  p.sessions[0].intents[2].defaultVariationId='not-real--legacy-default';assert.throws(()=>resolveCycle(p,'a',null),/无法识别/);
});
