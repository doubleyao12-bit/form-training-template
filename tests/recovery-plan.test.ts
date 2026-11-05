import { resolveNextSession } from "../src/core-loop";
import { exerciseLibraryV1 } from "../src/library-v1";
import { RECOVERY_PLAN_NAME, recoveryStrengthWeekV05 } from "../src/recovery-plan";
import type { SessionTemplate } from "../src/domain/training";

const plan = recoveryStrengthWeekV05("playbook-1");
const sessions = plan.sessions.map((session, index):SessionTemplate => ({
  ...session, id:`recovery-${index+1}`, userId:"user-1", planId:"recovery-plan", intents:session.intents.map((intent, intentIndex)=>({
    ...intent, id:`intent-${index}-${intentIndex}`, userId:"user-1", sessionTemplateId:`recovery-${index+1}`,
    explicitOptionIds:intent.explicitOptionIds ?? [], createdAt:"2026-09-15", updatedAt:"2026-09-15",
  })), createdAt:"2026-09-15", updatedAt:"2026-09-15",
}));

const equal=(actual:unknown,expected:unknown)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)};
const ok=(value:unknown,message="Expected truthy value")=>{if(!value)throw new Error(message)};

export function runRecoveryPlanTests(){
  equal(plan.name,RECOVERY_PLAN_NAME);
  equal(plan.sessions.length,7);
  equal(plan.sessions.map(session=>session.order),[0,1,2,3,4,5,6]);
  equal(plan.sessions[6].intents.length,1);
  ok((plan.sessions[6].purpose ?? "").includes("恢复"));
  const variationIds=new Set(exerciseLibraryV1.variations.map(item=>item.id));
  for(const session of plan.sessions) for(const intent of session.intents){
    ok(variationIds.has(intent.defaultVariationId),`missing ${intent.defaultVariationId}`);
    for(const option of intent.explicitOptionIds ?? []) ok(variationIds.has(option),`missing option ${option}`);
  }
  equal(resolveNextSession(sessions,[])?.id,"recovery-1");
  equal(resolveNextSession(sessions,[{sourceSessionTemplateId:"recovery-1",completedAt:"2026-09-15"}])?.id,"recovery-2");
  equal(resolveNextSession(sessions,[{sourceSessionTemplateId:"recovery-7",completedAt:"2026-09-15"}])?.id,"recovery-1");
  equal(resolveNextSession(sessions,[{sourceSessionTemplateId:"regular-b",completedAt:"2026-09-16"}])?.id,"recovery-1");
  const regular=sessions.slice(0,4).map((session,index)=>({...session,id:`regular-${index+1}`}));
  const mixed=[
    {sourceSessionTemplateId:"regular-2",completedAt:"2026-09-14"},
    {sourceSessionTemplateId:"recovery-3",completedAt:"2026-09-15"},
  ];
  equal(resolveNextSession(regular,mixed)?.id,"regular-3");
  equal(resolveNextSession(sessions,mixed)?.id,"recovery-4");
  const reverted=[...mixed,{sourceSessionTemplateId:"recovery-4",completedAt:"2026-09-16",revertedAt:"2026-09-17"}];
  equal(resolveNextSession(sessions,reverted)?.id,"recovery-4");
}
