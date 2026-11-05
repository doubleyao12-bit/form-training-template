import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionTemplate, TrainingIntent, TrainingPlaybook, TrainingPlaybookDraft, TrainingPlanAggregate, TrainingPlanDraft, WorkoutRunAggregate } from "../../domain/training";
import { resolveNextSession } from "../../core-loop";
import type { JointFunctionId, MovementPattern, TrainingGoal } from "../../types";
import type { PlanRepository } from "../repositories";
import { requireUserId, valueOrUndefined } from "./helpers";
import { validateEditablePlan } from "../../plan-edit";

type Row = Record<string, unknown>;

export class SupabasePlanRepository implements PlanRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getActivePlan(progression?: Promise<Array<Pick<WorkoutRunAggregate, "sourceSessionTemplateId" | "completedAt" | "revertedAt">>>) {
    const userId = await requireUserId(this.client);
    const { data, error } = await this.client.from("training_plans").select("*").eq("user_id", userId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data ? this.loadAggregate(data as Row, progression) : null;
  }

  async listPlans(includeDeleted = false) {
    const userId = await requireUserId(this.client);
    let request = this.client.from("training_plans").select("*").eq("user_id", userId).order("created_at");
    if (!includeDeleted) request = request.neq("status", "deleted");
    const { data, error } = await request;
    if (error) throw error;
    return Promise.all((data ?? []).map(row => this.loadAggregate(row as Row)));
  }

  async setActivePlan(id: string) {
    const userId = await requireUserId(this.client);
    const previous = await this.getActivePlan();
    const target = await this.getPlan(id);
    if (!target) throw new Error("找不到要切换的训练计划。");
    if (target.status === "active") return target;
    const { error: archiveError } = await this.client.from("training_plans").update({ status:"archived" }).eq("user_id", userId).eq("status", "active");
    if (archiveError) throw archiveError;
    const { error: activateError } = await this.client.from("training_plans").update({ status:"active" }).eq("user_id", userId).eq("id", id);
    if (activateError) {
      if (previous) await this.client.from("training_plans").update({ status:"active" }).eq("user_id", userId).eq("id", previous.id);
      throw activateError;
    }
    return (await this.getPlan(id))!;
  }

  async getPlan(id: string) {
    const userId = await requireUserId(this.client);
    const { data, error } = await this.client.from("training_plans").select("*").eq("user_id", userId).eq("id", id).neq("status", "deleted").maybeSingle();
    if (error) throw error;
    return data ? this.loadAggregate(data as Row) : null;
  }

  async createPlan(draft: TrainingPlanDraft, status: "active" | "archived" = "active") {
    const issue=validateEditablePlan(draft);if(issue)throw new Error(issue);
    const userId = await requireUserId(this.client);
    const { data: plan, error: planError } = await this.client.from("training_plans").insert({
      user_id: userId, name: draft.name, status, goal_summary: draft.goalSummary,
      cycle_name: draft.cycleName, cycle_focus: draft.cycleFocus, playbook_id: draft.playbookId,
      rationale: draft.rationale, planned_weeks: draft.plannedWeeks, expected_sessions_per_week: draft.expectedSessionsPerWeek,
      start_date: draft.startDate, end_date: draft.endDate,
    }).select("*").single();
    if (planError) throw planError;

    try {
      for (const sessionDraft of draft.sessions) {
        const { data: session, error: sessionError } = await this.client.from("session_templates").insert({
          user_id: userId, plan_id: plan.id, name: sessionDraft.name, purpose: sessionDraft.purpose, order_index: sessionDraft.order, design_notes: { ...sessionDraft.designNotes, warmupBlock: sessionDraft.warmupBlock },
        }).select("id").single();
        if (sessionError) throw sessionError;
        for (const intentDraft of sessionDraft.intents) {
          const { data: intent, error: intentError } = await this.client.from("training_intents").insert({
            user_id: userId, session_template_id: session.id, label: intentDraft.label, order_index: intentDraft.order,
            movement_pattern: intentDraft.movementPattern, training_goal: intentDraft.trainingGoal,
            joint_function_id: intentDraft.jointFunctionId, default_variation_id: intentDraft.defaultVariationId,
            prescription: intentDraft.prescription, training_role:intentDraft.trainingRole, rotation_joint_function_ids:intentDraft.rotationJointFunctionIds,
          }).select("id").single();
          if (intentError) throw intentError;
          const options = intentDraft.explicitOptionIds?.map((variationId, order) => ({ user_id: userId, training_intent_id: intent.id, variation_id: variationId, order_index: order })) ?? [];
          if (options.length) {
            const { error } = await this.client.from("training_intent_options").insert(options);
            if (error) throw error;
          }
        }
      }
      const created = await this.getPlan(plan.id);
      if (!created || created.sessions.length !== draft.sessions.length || created.sessions.some((session, index) => session.intents.length !== draft.sessions[index].intents.length)) {
        throw new Error("新方案写入后的完整性校验失败。当前计划未改变。");
      }
      return created;
    } catch (cause) {
      const { error: cleanupError } = await this.client.from("training_plans").delete().eq("user_id", userId).eq("id", plan.id);
      if (cleanupError) throw new AggregateError([cause, cleanupError], "方案写入失败，且未能清理未完成的草稿。当前计划未改变。");
      throw cause;
    }
  }

  async importPlan(draft: TrainingPlanDraft) {
    // The previous active Plan remains current until the new aggregate is fully written and read back.
    const imported = await this.createPlan(draft, "archived");
    try {
      return await this.setActivePlan(imported.id);
    } catch (cause) {
      const userId = await requireUserId(this.client);
      const { error: cleanupError } = await this.client.from("training_plans").delete().eq("user_id", userId).eq("id", imported.id).eq("status", "archived");
      if (cleanupError) throw new AggregateError([cause, cleanupError], "方案激活失败，且未能清理新方案。原计划仍保持不变。");
      throw cause;
    }
  }

  async renamePlan(id: string, name: string) {
    const userId = await requireUserId(this.client);
    const { error } = await this.client.from("training_plans").update({ name }).eq("user_id", userId).eq("id", id);
    if (error) throw error;
    const plan = await this.getPlan(id);
    if (!plan) throw new Error("Plan not found after update.");
    return plan;
  }

  async updatePlan(id: string, draft: TrainingPlanDraft) {
    const issue = validateEditablePlan(draft);
    if (issue) throw new Error(issue);
    const existing = await this.getPlan(id);
    if (!existing) throw new Error("找不到要编辑的训练计划。");
    const { error } = await this.client.rpc("form_update_training_plan_v23", {
      p_plan_id: id, p_expected_updated_at: existing.updatedAt, p_draft: draft,
    });
    if (error) throw error;
    const updated = await this.getPlan(id);
    if (!updated) throw new Error("计划保存后无法读取，请重新加载。");
    return updated;
  }

  async deletePlan(id: string) {
    const { error } = await this.client.rpc("form_delete_training_plan", { p_plan_id: id });
    if (error) throw error;
  }

  private async loadAggregate(plan: Row, progression?: Promise<Array<Pick<WorkoutRunAggregate, "sourceSessionTemplateId" | "completedAt" | "revertedAt">>>): Promise<TrainingPlanAggregate> {
    const userId = String(plan.user_id);
    const planId = String(plan.id);
    const { data: sessionRows, error: sessionError } = await this.client.from("session_templates").select("*").eq("user_id", userId).eq("plan_id", planId).is("retired_at",null).order("order_index");
    if (sessionError) throw sessionError;
    const rows = (sessionRows ?? []) as Row[];
    const skeleton: SessionTemplate[] = rows.map(row => ({ id: String(row.id), order: Number(row.order_index), name: String(row.name), userId, planId, intents: [], createdAt: String(row.created_at), updatedAt: String(row.updated_at) }));
    const next = progression ? resolveNextSession(skeleton, await progression) : null;
    const sessionIds = progression ? next ? [next.id] : [] : rows.map(row => String(row.id));
    const { data: intentRows, error: intentError } = sessionIds.length
      ? await this.client.from("training_intents").select("*").eq("user_id", userId).in("session_template_id", sessionIds).is("retired_at",null).order("order_index")
      : { data: [], error: null };
    if (intentError) throw intentError;
    const intentIds = (intentRows ?? []).map(row => String(row.id));
    const { data: optionRows, error: optionError } = intentIds.length
      ? await this.client.from("training_intent_options").select("training_intent_id,variation_id,order_index").eq("user_id", userId).in("training_intent_id", intentIds).order("order_index")
      : { data: [], error: null };
    if (optionError) throw optionError;
    const optionsByIntent = new Map<string, string[]>();
    for (const row of optionRows ?? []) optionsByIntent.set(String(row.training_intent_id), [...(optionsByIntent.get(String(row.training_intent_id)) ?? []), String(row.variation_id)]);
    const intentsBySession = new Map<string, TrainingIntent[]>();
    for (const intentRow of (intentRows ?? []) as Row[]) {
      const sessionId = String(intentRow.session_template_id);
      const intent: TrainingIntent = {
        trainingRole: valueOrUndefined(intentRow.training_role as TrainingIntent["trainingRole"]|null),
        rotationJointFunctionIds: valueOrUndefined(intentRow.rotation_joint_function_ids as TrainingIntent["rotationJointFunctionIds"]|null),
        id: String(intentRow.id), userId, sessionTemplateId: sessionId, label: String(intentRow.label), order: Number(intentRow.order_index),
        movementPattern: valueOrUndefined(intentRow.movement_pattern as MovementPattern | null), trainingGoal: valueOrUndefined(intentRow.training_goal as TrainingGoal | null),
        jointFunctionId: valueOrUndefined(intentRow.joint_function_id as JointFunctionId | null), defaultVariationId: String(intentRow.default_variation_id),
        explicitOptionIds: optionsByIntent.get(String(intentRow.id)) ?? [], createdAt: String(intentRow.created_at), updatedAt: String(intentRow.updated_at),
        prescription: valueOrUndefined(intentRow.prescription as TrainingIntent["prescription"] | null),
      };
      intentsBySession.set(sessionId, [...(intentsBySession.get(sessionId) ?? []), intent]);
    }
    const sessions: SessionTemplate[] = rows.map(sessionRow => {
      const sessionId = String(sessionRow.id);
      const storedNotes = valueOrUndefined(sessionRow.design_notes as (SessionTemplate["designNotes"] & { warmupBlock?: SessionTemplate["warmupBlock"] }) | null);
      return { id: sessionId, userId, planId, name: String(sessionRow.name), purpose: valueOrUndefined(sessionRow.purpose as string | null), designNotes: storedNotes, warmupBlock: storedNotes?.warmupBlock, order: Number(sessionRow.order_index), intents: intentsBySession.get(sessionId) ?? [], createdAt: String(sessionRow.created_at), updatedAt: String(sessionRow.updated_at) };
    });
    return {
      id: planId, userId, name: String(plan.name), status: plan.status as TrainingPlanAggregate["status"],
      goalSummary: valueOrUndefined(plan.goal_summary as string | null), cycleName: valueOrUndefined(plan.cycle_name as string | null), cycleFocus: valueOrUndefined(plan.cycle_focus as string | null),
      playbookId: valueOrUndefined(plan.playbook_id as string | null), rationale: valueOrUndefined(plan.rationale as string | null),
      plannedWeeks: valueOrUndefined(plan.planned_weeks as number | null), expectedSessionsPerWeek: valueOrUndefined(plan.expected_sessions_per_week as number | null),
      startDate: valueOrUndefined(plan.start_date as string | null), endDate: valueOrUndefined(plan.end_date as string | null), createdAt: String(plan.created_at), updatedAt: String(plan.updated_at), sessions,
    };
  }
  async getActivePlaybook() {
    const userId = await requireUserId(this.client);
    const { data, error } = await this.client.from("training_playbooks").select("*").eq("user_id", userId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data ? mapPlaybook(data as Row) : null;
  }

  async saveProgram(playbookDraft: TrainingPlaybookDraft, draft: TrainingPlanDraft) {
    const userId = await requireUserId(this.client);
    const { data: playbookRow, error: playbookError } = await this.client.from("training_playbooks").upsert({
      user_id: userId, name: playbookDraft.name, version: playbookDraft.version, status: playbookDraft.status,
      positioning: playbookDraft.positioning, core_principles: playbookDraft.corePrinciples,
      organization_rules: playbookDraft.organizationRules, frequency_rules: playbookDraft.frequencyRules,
      plan_change_rules: playbookDraft.planChangeRules, effectiveness_criteria: playbookDraft.effectivenessCriteria,
    }, { onConflict: "user_id,name,version" }).select("*").single();
    if (playbookError) throw playbookError;
    const playbook = mapPlaybook(playbookRow as Row);
    const active = await this.getActivePlan();
    if (!active) return { playbook, plan: await this.createPlan({ ...draft, playbookId: playbook.id }) };

    const { error: planError } = await this.client.from("training_plans").update({
      name: draft.name, goal_summary: draft.goalSummary, cycle_name: draft.cycleName, cycle_focus: draft.cycleFocus,
      playbook_id: playbook.id, rationale: draft.rationale, planned_weeks: draft.plannedWeeks,
      expected_sessions_per_week: draft.expectedSessionsPerWeek, start_date: draft.startDate, end_date: draft.endDate,
    }).eq("user_id", userId).eq("id", active.id);
    if (planError) throw planError;

    const { data: sessionRows, error: sessionReadError } = await this.client.from("session_templates").select("id,order_index").eq("user_id", userId).eq("plan_id", active.id);
    if (sessionReadError) throw sessionReadError;
    const sessionsByOrder = new Map((sessionRows ?? []).map(row => [Number(row.order_index), String(row.id)]));
    for (const sessionDraft of draft.sessions) {
      let sessionId = sessionsByOrder.get(sessionDraft.order);
      if (sessionId) {
        const { error } = await this.client.from("session_templates").update({ name: sessionDraft.name, purpose: sessionDraft.purpose, design_notes: { ...sessionDraft.designNotes, warmupBlock: sessionDraft.warmupBlock } }).eq("user_id", userId).eq("id", sessionId);
        if (error) throw error;
      } else {
        const { data, error } = await this.client.from("session_templates").insert({ user_id: userId, plan_id: active.id, name: sessionDraft.name, purpose: sessionDraft.purpose, order_index: sessionDraft.order, design_notes: { ...sessionDraft.designNotes, warmupBlock: sessionDraft.warmupBlock } }).select("id").single();
        if (error) throw error;
        sessionId = String(data.id);
      }
      const { data: intentRows, error: intentReadError } = await this.client.from("training_intents").select("id,order_index").eq("user_id", userId).eq("session_template_id", sessionId);
      if (intentReadError) throw intentReadError;
      const intentsByOrder = new Map((intentRows ?? []).map(row => [Number(row.order_index), String(row.id)]));
      for (const intentDraft of sessionDraft.intents) {
        const values = { label: intentDraft.label, movement_pattern: intentDraft.movementPattern, training_goal: intentDraft.trainingGoal, joint_function_id: intentDraft.jointFunctionId, default_variation_id: intentDraft.defaultVariationId, prescription: intentDraft.prescription };
        let intentId = intentsByOrder.get(intentDraft.order);
        if (intentId) {
          const { error } = await this.client.from("training_intents").update(values).eq("user_id", userId).eq("id", intentId);
          if (error) throw error;
        } else {
          const { data, error } = await this.client.from("training_intents").insert({ user_id: userId, session_template_id: sessionId, order_index: intentDraft.order, ...values }).select("id").single();
          if (error) throw error;
          intentId = String(data.id);
        }
        const { error: deleteError } = await this.client.from("training_intent_options").delete().eq("user_id", userId).eq("training_intent_id", intentId);
        if (deleteError) throw deleteError;
        const options = intentDraft.explicitOptionIds?.map((variationId, order) => ({ user_id: userId, training_intent_id: intentId, variation_id: variationId, order_index: order })) ?? [];
        if (options.length) {
          const { error } = await this.client.from("training_intent_options").insert(options);
          if (error) throw error;
        }
      }
    }
    return { playbook, plan: (await this.getPlan(active.id))! };
  }
}

function mapPlaybook(row: Row): TrainingPlaybook {
  return {
    id: String(row.id), userId: String(row.user_id), name: String(row.name), version: String(row.version), status: row.status as TrainingPlaybook["status"],
    positioning: String(row.positioning), corePrinciples: row.core_principles as string[], organizationRules: row.organization_rules as string[],
    frequencyRules: row.frequency_rules as TrainingPlaybook["frequencyRules"], planChangeRules: row.plan_change_rules as string[],
    effectivenessCriteria: row.effectiveness_criteria as string[], createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}
