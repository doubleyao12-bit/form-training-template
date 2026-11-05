import type { PlanRepository } from "../data/repositories";
import type { TrainingPlanAggregate, TrainingPrescription } from "../domain/training";
import { getVariationDisplay } from "../exercise-display";

export const CURRENT_PLAN_CONTRACT_VERSION = "form.current-plan.v1" as const;

export type CurrentPlanResponse =
  | { contractVersion: typeof CURRENT_PLAN_CONTRACT_VERSION; state: "no_current_plan"; plan: null }
  | { contractVersion: typeof CURRENT_PLAN_CONTRACT_VERSION; state: "current_plan"; plan: SerializedCurrentPlan };

export interface SerializedCurrentPlan {
  id: string;
  name: string;
  status: "active" | "archived";
  goal?: string;
  cycle?: { name?: string; focus?: string };
  rationale?: string;
  plannedWeeks?: number;
  expectedSessionsPerWeek?: number;
  startDate?: string;
  endDate?: string;
  updatedAt: string;
  sessions: Array<{
    id: string;
    name: string;
    order: number;
    purpose?: string;
    intents: Array<{
      id: string;
      label: string;
      order: number;
      movementPattern?: string;
      trainingGoal?: string;
      jointFunctionId?: string;
      exercise: { variationId: string; nameZh: string; nameEn: string };
      alternativeVariationIds: string[];
      prescription?: TrainingPrescription;
    }>;
  }>;
}

export async function getMyCurrentPlan(repository: Pick<PlanRepository, "getActivePlan">): Promise<CurrentPlanResponse> {
  const plan = await repository.getActivePlan();
  if (!plan) return { contractVersion: CURRENT_PLAN_CONTRACT_VERSION, state: "no_current_plan", plan: null };
  return { contractVersion: CURRENT_PLAN_CONTRACT_VERSION, state: "current_plan", plan: serializeCurrentPlan(plan) };
}

export function serializeCurrentPlan(plan: TrainingPlanAggregate): SerializedCurrentPlan {
  if (plan.status === "deleted") throw new Error("Deleted Plan cannot be exposed as Current Plan.");
  return {
    id: plan.id,
    name: plan.name,
    status: plan.status,
    goal: plan.goalSummary,
    cycle: plan.cycleName || plan.cycleFocus ? { name: plan.cycleName, focus: plan.cycleFocus } : undefined,
    rationale: plan.rationale,
    plannedWeeks: plan.plannedWeeks,
    expectedSessionsPerWeek: plan.expectedSessionsPerWeek,
    startDate: plan.startDate,
    endDate: plan.endDate,
    updatedAt: plan.updatedAt,
    sessions: [...plan.sessions].sort((a, b) => a.order - b.order).map(session => ({
      id: session.id,
      name: session.name,
      order: session.order,
      purpose: session.purpose,
      intents: [...session.intents].sort((a, b) => a.order - b.order).map(intent => ({
        id: intent.id,
        label: intent.label,
        order: intent.order,
        movementPattern: intent.movementPattern,
        trainingGoal: intent.trainingGoal,
        jointFunctionId: intent.jointFunctionId,
        exercise: { variationId: intent.defaultVariationId, ...getVariationDisplay(intent.defaultVariationId) },
        alternativeVariationIds: [...intent.explicitOptionIds],
        prescription: intent.prescription,
      })),
    })),
  };
}
