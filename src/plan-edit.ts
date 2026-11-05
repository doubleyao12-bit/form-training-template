import type { TrainingPlanAggregate, TrainingPlanDraft } from "./domain/training";
import { exerciseLibraryV1 } from "./library-v1";
import { resolveSessionWarmup } from "./warmup-resolver";
import { replacementCandidates } from "./replacement-engine";
import { supportsPrescription } from "./replacement-engine";
import type { MeasurementAdjustment } from "./replacement-engine";
import {resolveVariationId, adjustedPrescription} from "./flexible-training";
import {jointFunctionVocabulary} from './types';

export function draftFromPlan(plan: TrainingPlanAggregate): TrainingPlanDraft {
  return {
    name: plan.name, goalSummary: plan.goalSummary, cycleName: plan.cycleName,
    cycleFocus: plan.cycleFocus, playbookId: plan.playbookId, rationale: plan.rationale,
    plannedWeeks: plan.plannedWeeks, expectedSessionsPerWeek: plan.expectedSessionsPerWeek,
    startDate: plan.startDate, endDate: plan.endDate,
    sessions: plan.sessions.map(session => ({
      id: session.id,
      name: session.name, purpose: session.purpose, designNotes: session.designNotes,
      warmupBlock: resolveSessionWarmup(session), order: session.order,
      intents: session.intents.map(intent => ({
        id: intent.id, trainingRole: intent.trainingRole, rotationJointFunctionIds: intent.rotationJointFunctionIds,
        label: intent.label, order: intent.order, movementPattern: intent.movementPattern,
        trainingGoal: intent.trainingGoal, jointFunctionId: intent.jointFunctionId,
        defaultVariationId: intent.defaultVariationId, explicitOptionIds: intent.explicitOptionIds,
        prescription: intent.prescription,
      })),
    })),
  };
}

export function validateEditablePlan(draft: TrainingPlanDraft): string | null {
  if (!draft.name.trim()) return "请填写计划名称。";
  if (!draft.sessions.length) return "计划至少需要一堂训练课。";
  if (draft.sessions.some((session, index) => session.order !== index || !session.name.trim() || !session.intents.length))
    return "每堂训练课需要名称和正式动作，顺序必须连续。";
  for (const session of draft.sessions) {
    if(session.intents.length>10)return "每堂训练课允许 1–10 个正式动作，建议 4–6 个。";
    if (session.warmupBlock && session.warmupBlock.exercises.length > 5) return "热身最多 5 个动作。";
    for (const [index, intent] of session.intents.entries()) {
      if (intent.order !== index) return "动作顺序必须连续。";
      const variation = resolveVariationId(intent.defaultVariationId);
      if (!variation) return `找不到动作执行方式：${intent.defaultVariationId}`;
      if(intent.trainingRole&&!['anchor','rotation','optional'].includes(intent.trainingRole))return "无效训练角色。";
      if(intent.rotationJointFunctionIds?.some(id=>!(id in jointFunctionVocabulary)))return "轮换功能必须来自受控词表。";
      const modes = intent.prescription?.measurement?.types;
      const p=intent.prescription;
      if(p?.sets!==undefined&&(!Number.isInteger(p.sets)||p.sets<1||p.sets>20))return "每个动作允许 1–20 组。";
      if(modes){
        if(!modes.length||new Set(modes).size!==modes.length)return "计量方式不能为空或重复。";
        for(const [mode,value] of [['reps',p?.targetReps],['duration',p?.targetDurationSeconds],['breaths',p?.targetBreaths]] as const){
          if(value!==undefined&&(!modes.includes(mode)||!Number.isInteger(value)||value<1))return "请仅填写当前计量方式对应的大于 0 的目标值。";
        }
      }
      if (modes?.some(mode => !variation.allowedMeasurementModes?.includes(mode))) return `动作执行方式不支持当前计量：${intent.defaultVariationId}`;
      if (intent.explicitOptionIds?.some(id => !exerciseLibraryV1.variations.some(item => item.id === id))) return "替代执行方式包含未知动作。";
      if (intent.explicitOptionIds?.some(id => {
        const option = exerciseLibraryV1.variations.find(item => item.id === id);
        return modes?.some(mode => !option?.allowedMeasurementModes?.includes(mode));
      })) return "替代执行方式不支持当前计量。";
    }
  }
  return null;
}

export function relatedVariations(variationId: string) {
  const current = exerciseLibraryV1.variations.find(item => item.id === variationId);
  const exercise = exerciseLibraryV1.exercises.find(item => item.id === current?.exerciseId);
  if (!current || !exercise) return [];
  const candidates = exerciseLibraryV1.variations.filter(item => {
    const owner = exerciseLibraryV1.exercises.find(value => value.id === item.exerciseId);
    return owner && (owner.id === exercise.id || (exercise.exerciseFamilyId && owner.exerciseFamilyId === exercise.exerciseFamilyId));
  });
  return candidates.sort((a,b) => Number(a.exerciseId !== exercise.id) - Number(b.exerciseId !== exercise.id));
}

export function rankPlanReplacements(intent: TrainingPlanDraft["sessions"][number]["intents"][number]) {
  return replacementCandidates({ ...intent, explicitOptionIds: intent.explicitOptionIds ?? [] }, intent.defaultVariationId).slice(0, 12);
}

export function replacePlanIntent(intent: TrainingPlanDraft["sessions"][number]["intents"][number], variationId: string, adjustment?: MeasurementAdjustment) {
  const variation = exerciseLibraryV1.variations.find(item => item.id === variationId);
  const exercise = exerciseLibraryV1.exercises.find(item => item.id === variation?.exerciseId);
  if (!variation || !exercise) throw new Error("找不到所选动作。");
  if (!supportsPrescription(variation, intent) && !adjustment) throw new Error("新动作的计量方式不兼容，请先调整处方。");
  if (adjustment && (!variation.allowedMeasurementModes?.includes(adjustment.mode) || !Number.isFinite(adjustment.target) || adjustment.target <= 0)) throw new Error("新动作的计量目标无效。");
  const prescription = adjustment?adjustedPrescription(variationId,intent.prescription,adjustment):intent.prescription;
  return {...intent, defaultVariationId: variationId, movementPattern: intent.movementPattern??exercise.primaryMovementPattern??undefined,
    trainingGoal: intent.trainingGoal??exercise.trainingGoals[0], jointFunctionId: intent.jointFunctionId??exercise.primaryJointFunctions[0]?.jointFunctionId,
    explicitOptionIds: [], prescription};
}
