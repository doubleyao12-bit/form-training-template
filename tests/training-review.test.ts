import assert from "node:assert/strict";
import test from "node:test";
import type { TrainingPlanAggregate, WorkoutRunAggregate, WorkoutSet } from "../src/domain/training";
import { buildTrainingReview } from "../src/training-review";
import { loadTrainingReviewEvidence } from "../src/training-review-loader";
import type { HistoryRepository } from "../src/data/repositories";

const date = (day: number) => `2026-09-${String(day).padStart(2,"0")}T12:00:00.000Z`;
const plan = {
  id:"plan-a",name:"Test Plan",userId:"user-a",status:"active",expectedSessionsPerWeek:2,
  createdAt:date(1),updatedAt:date(1),sessions:[{id:"session-a",userId:"user-a",planId:"plan-a",name:"A",order:0,createdAt:date(1),updatedAt:date(1),intents:[
    {id:"intent-a",userId:"user-a",sessionTemplateId:"session-a",label:"Squat",order:0,defaultVariationId:"back-squat--legacy-default",explicitOptionIds:[],movementPattern:"Squat",createdAt:date(1),updatedAt:date(1)},
    {id:"intent-b",userId:"user-a",sessionTemplateId:"session-a",label:"Pull",order:1,defaultVariationId:"pull-up--default",explicitOptionIds:[],movementPattern:"Vertical Pull",createdAt:date(1),updatedAt:date(1)},
  ]}],
} as TrainingPlanAggregate;
function run(id:string,day:number,load:number,options:{reverted?:boolean;planId?:string;duration?:number;reps?:number}={}):WorkoutRunAggregate {
  const set={
    id:`set-${id}`,userId:"user-a",workoutExerciseId:`exercise-${id}`,order:0,
    targetLoad:60,targetReps:5,targetRPE:7,actualLoad:load,actualReps:options.reps??5,actualRPE:7,
    completed:true,version:1,updatedAt:date(day),
    ...(options.duration ? {measurementSnapshot:{version:1,types:["duration"],trackLoad:false},actualDurationSeconds:options.duration,targetDurationSeconds:20} : {}),
  } as WorkoutSet;
  return {
    id,userId:"user-a",sourcePlanId:options.planId??"plan-a",sourceSessionTemplateId:"session-a",
    status:"completed",sessionSnapshot:{name:"A",order:0,capturedAt:date(day)},
    exercises:[{id:`exercise-${id}`,userId:"user-a",workoutRunId:id,order:0,
      intentSnapshot:{label:"Squat",order:0,movementPattern:"Squat",defaultVariationId:"back-squat--legacy-default",explicitOptionIds:[]},
      defaultVariationId:"back-squat--legacy-default",selectedVariationId:"back-squat--legacy-default",
      exerciseSnapshot:{exerciseId:"back-squat",variationId:"back-squat--legacy-default",nameZh:"杠铃后蹲",nameEn:"Back Squat"},
      status:"completed",sets:[set]}],
    completedAt:date(day),revertedAt:options.reverted?date(day):undefined,version:1,createdAt:date(day),updatedAt:date(day),
  };
}
test("4W review keeps adherence Plan-scoped while comparing owned performance across Plans",()=>{
  const input=[run("one",4,60),run("two",11,70),run("three",18,75),run("reverted",22,200,{reverted:true}),run("other-plan",24,250,{planId:"plan-b"})];
  const before=structuredClone(input);
  const review=buildTrainingReview(plan,input,new Date("2026-09-29T00:00:00Z"));
  assert.equal(review.period,"4W");
  assert.equal(review.completedSessions,3);
  assert.equal(review.expectedSessions,8);
  assert.equal(review.performanceSessions,4);
  assert(review.evidence.some(item=>item.area==="progress"&&item.runIds.includes("other-plan")));
  assert(review.evidence.find(item=>item.area==="adherence")?.runIds.every(id=>["one","two","three"].includes(id)));
  assert(review.opportunities.some(item=>item.title.includes("渐进")));
  assert(review.flags.some(item=>item.title.includes("完成度")));
  assert(review.evidence.some(item=>item.area==="coverage"&&item.detail.includes("Vertical Pull")));
  assert(review.evidence.some(item=>item.area==="prescription"&&item.detail.includes("3/3")));
  assert.deepEqual(input,before);
});
test("a newly selected Plan can still use older Plan performance without inventing adherence",()=>{
  const current={...plan,id:"fresh-plan",createdAt:date(20)};
  const result=buildTrainingReview(current,[run("old-one",4,60,{planId:"old-plan"}),run("old-two",18,70,{planId:"old-plan"})],new Date("2026-09-29T00:00:00Z"));
  assert.equal(result.completedSessions,0);
  assert.equal(result.performanceSessions,2);
  assert(result.opportunities.some(item=>item.title.includes("渐进")));
  assert(result.evidence.find(item=>item.area==="adherence")?.runIds.length===0);
});
test("three comparable exposures without gain are flagged, while sparse data stays cautious",()=>{
  const stalled=buildTrainingReview(plan,[run("a",4,60),run("b",11,60),run("c",18,60)],new Date("2026-09-29T00:00:00Z"));
  assert(stalled.flags.some(item=>item.title.includes("未见明显提升")));
  const sparse=buildTrainingReview(plan,[run("a",4,60)],new Date("2026-09-29T00:00:00Z"));
  assert(!sparse.flags.some(item=>item.title.includes("未见明显提升")));
});
test("one failed historical hydration retains usable evidence and reports the partial gap",async()=>{
  const one=run("one",18,70);
  const source={
    listRuns:async()=>[{id:"one",completedAt:one.completedAt,revertedAt:undefined},{id:"failed",completedAt:date(19),revertedAt:undefined},{id:"void",completedAt:date(20),revertedAt:date(20)}],
    getRun:async(id:string)=>id==="failed"?Promise.reject(new Error("one damaged row")):one,
  } as Pick<HistoryRepository,"listRuns"|"getRun">;
  const loaded=await loadTrainingReviewEvidence(source,new Date("2026-09-29T00:00:00Z"),100);
  assert.deepEqual(loaded.runs.map(item=>item.id),["one"]);
  assert.equal(loaded.summaryCount,2);
  assert.equal(loaded.excluded.hydrationFailed,1);
  assert.equal(loaded.excluded.reverted,1);
});
