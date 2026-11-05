import assert from "node:assert/strict";
import test from "node:test";
import { draftFromPlan, relatedVariations, validateEditablePlan } from "../src/plan-edit";
import { getVariationDisplay } from "../src/exercise-display";
import { createExampleTrainingPlan } from "../src/training-playbook";
import { recoveryStrengthWeekV05 } from "../src/recovery-plan";
import type { TrainingPlanAggregate } from "../src/domain/training";
import { warmupBlocks } from "../src/warmup";
import { resolveSessionWarmup } from "../src/warmup-resolver";
import { getConcreteVariationDisplay } from "../src/exercise-display";
import { rankPlanReplacements } from "../src/plan-edit";

test("legacy Plans remain editable/readable without silently adding exercises",()=>{
  for (const draft of [createExampleTrainingPlan(),recoveryStrengthWeekV05()]) {
    assert.equal(validateEditablePlan(draft),null);
    const aggregate={...draft,id:"plan",userId:"user",status:"archived",createdAt:"2026-09-01",updatedAt:"2026-09-01",
      sessions:draft.sessions.map((session,index)=>({...session,id:`session-${index}`,userId:"user",planId:"plan",createdAt:"2026-09-01",updatedAt:"2026-09-01",
        intents:session.intents.map((intent,i)=>({...intent,id:`intent-${index}-${i}`,userId:"user",sessionTemplateId:`session-${index}`,explicitOptionIds:intent.explicitOptionIds??[],createdAt:"2026-09-01",updatedAt:"2026-09-01"}))}))} as TrainingPlanAggregate;
    const converted=draftFromPlan(aggregate);
    assert.deepEqual(converted.sessions.map(item=>item.intents.length),draft.sessions.map(item=>item.intents.length));
    assert.deepEqual(converted.sessions.map(item=>item.warmupBlock?.id),aggregate.sessions.map(session=>resolveSessionWarmup(session).id));
    assert.deepEqual(draft.sessions.map(item=>item.warmupBlock?.id),aggregate.sessions.map(item=>item.warmupBlock?.id));
  }
});
test("variation choices stay in same Exercise/family without treating trap bar as RDL",()=>{
  const rdl=relatedVariations("romanian-deadlift--legacy-default");
  assert(rdl.some(item=>item.id==="dumbbell-romanian-deadlift--legacy-default"));
  assert(!rdl.some(item=>item.id==="trap-bar-deadlift--legacy-default"));
  assert.equal(getVariationDisplay("dumbbell-romanian-deadlift--legacy-default").nameZh,"哑铃罗马尼亚硬拉");
});
test("Plan edit rejects unknown defaults and incompatible measurement",()=>{
  const draft=createExampleTrainingPlan();
  draft.sessions[0].intents[0].defaultVariationId="missing-variation";
  assert.match(validateEditablePlan(draft)??"",/找不到动作执行方式/);
});
test("legacy warm-up derives from actual movements, not session title or position",()=>{
  const cases = [
    {pattern:"Squat",variation:"back-squat--legacy-default",expected:"warmup-a"},
    {pattern:"Horizontal Push",variation:"barbell-bench-press--default",expected:"warmup-b"},
    {pattern:"Hip Hinge",variation:"romanian-deadlift--legacy-default",expected:"warmup-c"},
    {pattern:"Jump / Landing",variation:"pogo-jump--default",expected:"warmup-d"},
  ] as const;
  for(const item of cases){
    const session={warmupBlock:undefined,intents:[{label:"Action",order:0,defaultVariationId:item.variation,movementPattern:item.pattern,explicitOptionIds:[]}]};
    assert.equal(resolveSessionWarmup(session).id,item.expected);
    assert(resolveSessionWarmup(session).exercises.length<=5);
  }
  assert.equal(resolveSessionWarmup({warmupBlock:warmupBlocks.B,intents:[]}).id,"warmup-b");
  assert.equal(resolveSessionWarmup({warmupBlock:{...warmupBlocks.B,exercises:[]},intents:cases.slice(0,1).map(item=>({label:"",order:0,defaultVariationId:item.variation,movementPattern:item.pattern,explicitOptionIds:[]}))}).id,"warmup-a");
});
test("Plan replacement ranks concrete same-family and measurement-compatible options",()=>{
  const intent={label:"RDL",order:0,defaultVariationId:"romanian-deadlift--legacy-default",explicitOptionIds:[],measurement:undefined};
  const choices=rankPlanReplacements(intent);
  assert(choices.some(item=>item.variation.id==="dumbbell-romanian-deadlift--legacy-default"));
  assert(!choices.some(item=>item.variation.id==="trap-bar-deadlift--legacy-default" && item.reason.includes("同一动作族")));
  assert.equal(getConcreteVariationDisplay("romanian-deadlift--legacy-default").nameZh,"杠铃罗马尼亚硬拉");
  const deadlift=rankPlanReplacements({label:"Hard deadlift",order:0,defaultVariationId:"conventional-deadlift--legacy-default",explicitOptionIds:[]});
  assert(deadlift.some(item=>item.variation.id==="conventional-deadlift--dumbbell"));
  assert(deadlift.some(item=>item.variation.id==="trap-bar-deadlift--legacy-default"));
  assert.equal(getConcreteVariationDisplay("conventional-deadlift--legacy-default").nameZh,"杠铃传统硬拉");
});
