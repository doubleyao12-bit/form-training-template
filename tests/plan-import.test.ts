import assert from "node:assert/strict";
import test from "node:test";
import type { TrainingPlanAggregate, TrainingPlanDraft } from "../src/domain/training";
import { resolveNextSession } from "../src/core-loop";
import { PLAN_IMPORT_VERSION, applyValidatedPlanImport, parseAndValidatePlanImport, resolveExerciseReference, validateAndApplyPlanImport } from "../src/plan-import";

const validPackage = {
  version: PLAN_IMPORT_VERSION,
  plan: {
    name: "Strength & Athletic V2",
    goalSummary: "建立全身力量与躯干控制",
    cycleName: "Foundation · 4 Weeks",
    cycleFocus: "力量与稳定",
    plannedWeeks: 4,
    expectedSessionsPerWeek: 2,
    sessions: [
      { order: 0, title: "A · 下肢力量", purpose: "深蹲主导", warmupProfile: "A", exercises: [
        { order: 0, exercise: "back-squat--legacy-default", measurement: "reps", sets: 4, reps: 5, loadKg: 60, rpe: 7, restSeconds: 120 },
        { order: 1, exercise: "short-lever-copenhagen-plank--default", measurement: "duration", sets: 3, durationSeconds: 20, side: "eachSide" },
        { order: 2, exercise: "pallof-press--legacy-default", measurement: "reps", sets: 3, reps: 10 },
        { order: 3, exercise: "goblet-squat--legacy-default", measurement: "reps", sets: 3, reps: 8 },
        { order: 4, exercise: "dead-bug--default", measurement: "reps", sets: 2, reps: 10 },
      ] },
      { order: 1, title: "B · 呼吸与控制", warmupProfile: "B", exercises: [
        { order: 0, exercise: "wall-breathing", measurement: "breaths", sets: 2, breaths: 5 },
        { order: 1, exercise: "back-squat--legacy-default", measurement: "reps", sets: 3, reps: 5 },
        { order: 2, exercise: "pallof-press--legacy-default", measurement: "reps", sets: 3, reps: 10 },
        { order: 3, exercise: "goblet-squat--legacy-default", measurement: "reps", sets: 3, reps: 8 },
        { order: 4, exercise: "dead-bug--default", measurement: "reps", sets: 2, reps: 10 },
      ] },
    ],
  },
};

test("valid complete Plan validates and preserves ordering and prescriptions", () => {
  const result = parseAndValidatePlanImport(JSON.stringify(validPackage));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.draft.sessions.map(session => session.name), ["A · 下肢力量", "B · 呼吸与控制"]);
  assert.equal(result.draft.sessions[0].intents[0].defaultVariationId, "back-squat--legacy-default");
  assert.deepEqual(result.draft.sessions[0].intents[0].prescription, {
    measurement: { version: 1, types: ["reps"], trackLoad: true }, sets: 4, targetReps: 5,
    targetDurationSeconds: undefined, targetBreaths: undefined, targetLoad: 60, targetRPE: 7,
    targetRIR: undefined, restSeconds: 120, tempo: undefined,
  });
  assert.equal(result.draft.sessions[0].intents[1].prescription?.targetDurationSeconds, 20);
  assert.equal(result.draft.sessions[1].intents[0].prescription?.targetBreaths, 5);
  assert.equal(result.draft.sessions[0].warmupBlock?.id, "warmup-a");
  assert.equal(result.draft.sessions[1].warmupBlock?.id, "warmup-b");
  assert.equal(result.draft.sessions[0].intents.length, 5);
});

test("explicit A/B/C/D warm-up profiles map to the matching low-fatigue blocks", () => {
  const candidate = structuredClone(validPackage);
  const template = candidate.plan.sessions[0];
  candidate.plan.sessions = (["A","B","C","D"] as const).map((profile,order)=>({
    ...structuredClone(template),order,title:`Session ${profile}`,warmupProfile:profile,
  }));
  const result = parseAndValidatePlanImport(JSON.stringify(candidate));
  assert.equal(result.ok,true);
  if (!result.ok) return;
  assert.deepEqual(result.draft.sessions.map(item=>item.warmupBlock?.id),["warmup-a","warmup-b","warmup-c","warmup-d"]);
  assert(result.draft.sessions.every(item=>item.warmupBlock!.exercises.length<=5));
  assert(result.draft.sessions.every(item=>item.intents.length===5));
});

test("malformed package and unsupported version are rejected", () => {
  assert.equal(parseAndValidatePlanImport("not json").ok, false);
  const unsupported = structuredClone(validPackage);
  unsupported.version = "form.plan-import.v2" as typeof PLAN_IMPORT_VERSION;
  const result = parseAndValidatePlanImport(JSON.stringify(unsupported));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0].code, "unsupported_version");
});

test("unknown, ambiguous, invalid measurement and incomplete Session are rejected", () => {
  const unknown = structuredClone(validPackage);
  unknown.plan.sessions[0].exercises[0].exercise = "not-a-real-exercise";
  const unknownResult = parseAndValidatePlanImport(JSON.stringify(unknown));
  assert.equal(unknownResult.ok, false);
  if (!unknownResult.ok) assert(unknownResult.issues.some(issue => issue.code === "unknown_exercise"));

  const invalidMeasurement = structuredClone(validPackage);
  invalidMeasurement.plan.sessions[0].exercises[1] = { ...invalidMeasurement.plan.sessions[0].exercises[1], measurement: "reps", reps: undefined } as never;
  const measurementResult = parseAndValidatePlanImport(JSON.stringify(invalidMeasurement));
  assert.equal(measurementResult.ok, false);

  const incomplete = structuredClone(validPackage) as { plan: { sessions: Array<{ exercises: unknown[] }> } };
  incomplete.plan.sessions[0].exercises = [];
  assert.equal(parseAndValidatePlanImport(JSON.stringify(incomplete)).ok, false);

  const ambiguous = resolveExerciseReference("恢复强化周默认方式");
  assert.deepEqual(ambiguous, { error: "ambiguous" });
});

test("failed validation performs zero writes", async () => {
  let writes = 0;
  const repository = { importPlan: async (_draft: TrainingPlanDraft) => { writes += 1; throw new Error("must not run"); } };
  const result = await validateAndApplyPlanImport("not json", repository);
  assert.equal(result.ok, false);
  assert.equal(writes, 0);
});

test("confirmed valid import is directly resolvable by Today", async () => {
  let writes = 0;
  const repository = { importPlan: async (draft: TrainingPlanDraft): Promise<TrainingPlanAggregate> => {
    writes += 1;
    const now = "2026-09-22T00:00:00Z";
    return {
      id: "imported", userId: "user-a", name: draft.name, status: "active", createdAt: now, updatedAt: now,
      sessions: draft.sessions.map((session, sessionIndex) => ({
        id: `session-${sessionIndex}`, userId: "user-a", planId: "imported", name: session.name, purpose: session.purpose,
        warmupBlock: session.warmupBlock,
        order: session.order, createdAt: now, updatedAt: now,
        intents: session.intents.map((intent, intentIndex) => ({
          id: `intent-${sessionIndex}-${intentIndex}`, userId: "user-a", sessionTemplateId: `session-${sessionIndex}`,
          label: intent.label, order: intent.order, movementPattern: intent.movementPattern, trainingGoal: intent.trainingGoal,
          jointFunctionId: intent.jointFunctionId, defaultVariationId: intent.defaultVariationId,
          explicitOptionIds: intent.explicitOptionIds ?? [], prescription: intent.prescription, createdAt: now, updatedAt: now,
        })),
      })),
    };
  } };
  const result = await validateAndApplyPlanImport(JSON.stringify(validPackage), repository);
  assert.equal(result.ok, true);
  assert.equal(writes, 1);
  if (!result.ok) return;
  const next = resolveNextSession(result.plan.sessions, []);
  assert.equal(next?.name, "A · 下肢力量");
  assert.equal(next?.intents.length, 5);
  assert.equal(next?.warmupBlock?.id, "warmup-a");
  assert.equal(next?.intents[0].prescription?.targetReps, 5);
});

test("confirmed overwrite retains Plan ID, does not duplicate, and leaves History untouched",async()=>{
  const parsed=parseAndValidatePlanImport(JSON.stringify(validPackage));
  assert.equal(parsed.ok,true); if(!parsed.ok)return;
  const history=[{id:"historical-run",sourcePlanId:"existing"}];
  let created=0,updated=0;
  const repository={
    importPlan:async()=>{created++;throw new Error("must not create");},
    updatePlan:async(id:string,draft:TrainingPlanDraft)=>{updated++;assert.equal(id,"existing");assert.equal(draft.sessions.length,2);return {id,...draft,status:"active" as const,userId:"owner",createdAt:"now",updatedAt:"now",sessions:[]} as TrainingPlanAggregate;},
  };
  const result=await applyValidatedPlanImport(parsed,repository,{kind:"overwrite",planId:"existing"});
  assert.equal(result.id,"existing");assert.equal(updated,1);assert.equal(created,0);
  assert.deepEqual(history,[{id:"historical-run",sourcePlanId:"existing"}]);
});

test("new Plan path remains available; active workout blocks either import before writes",async()=>{
  const parsed=parseAndValidatePlanImport(JSON.stringify(validPackage));
  assert.equal(parsed.ok,true); if(!parsed.ok)return;
  let creates=0,updates=0;
  const repository={
    importPlan:async(draft:TrainingPlanDraft)=>{creates++;return {id:"new",...draft,status:"active" as const,userId:"owner",createdAt:"now",updatedAt:"now",sessions:[]} as TrainingPlanAggregate;},
    updatePlan:async()=>{updates++;throw new Error("must not update");},
  };
  assert.equal((await applyValidatedPlanImport(parsed,repository,{kind:"create"})).id,"new");
  assert.equal(creates,1);
  await assert.rejects(()=>applyValidatedPlanImport(parsed,repository,{kind:"overwrite",planId:"existing"},{id:"active"} as never),/完成或重置/);
  assert.equal(creates,1);assert.equal(updates,0);
});
