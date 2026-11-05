import { z } from "zod";
import { resolveNextSession } from "./core-loop";
import type { PlanRepository } from "./data/repositories";
import type { MeasurementSnapshot, TrainingPlanDraft, WorkoutRunAggregate } from "./domain/training";
import { exerciseLibraryV1 } from "./library-v1";
import type { ExerciseV03, ExerciseVariationV03 } from "./schema.v03";
import { warmupBlocks } from "./warmup";
import {jointFunctionVocabulary,type JointFunctionId} from './types';

export const PLAN_IMPORT_VERSION = "form.plan-import.v1" as const;
export type ImportMeasurement = "reps" | "duration" | "breaths";

const referenceSchema = z.string().trim().min(1).max(160);
const importedExerciseSchema = z.object({
  order: z.number().int().min(0),
  exercise: referenceSchema,
  label: z.string().trim().min(1).max(120).optional(),
  trainingRole: z.enum(["anchor", "rotation", "optional"]).optional(),
  rotationJointFunctionIds: z.array(z.string().refine(value=>value in jointFunctionVocabulary,'Unknown joint function')).max(8).optional(),
  alternatives: z.array(referenceSchema).max(8).optional(),
  measurement: z.enum(["reps", "duration", "breaths"]),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(1000).optional(),
  durationSeconds: z.number().int().min(1).max(86400).optional(),
  breaths: z.number().int().min(1).max(1000).optional(),
  loadKg: z.number().min(0).max(2000).optional(),
  rpe: z.number().min(1).max(10).optional(),
  rir: z.number().min(0).max(10).optional(),
  restSeconds: z.number().int().min(0).max(3600).optional(),
  tempo: z.string().trim().min(1).max(32).optional(),
  side: z.enum(["eachSide"]).optional(),
}).strict();

const packageSchema = z.object({
  version: z.string(),
  plan: z.object({
    name: z.string().trim().min(1).max(120),
    goalSummary: z.string().trim().min(1).max(500).optional(),
    cycleName: z.string().trim().min(1).max(120).optional(),
    cycleFocus: z.string().trim().min(1).max(500).optional(),
    rationale: z.string().trim().min(1).max(2000).optional(),
    plannedWeeks: z.number().int().min(1).max(104).optional(),
    expectedSessionsPerWeek: z.number().int().min(1).max(14).optional(),
    sessions: z.array(z.object({
      order: z.number().int().min(0),
      title: z.string().trim().min(1).max(120),
      purpose: z.string().trim().min(1).max(500).optional(),
      warmupProfile: z.enum(["A", "B", "C", "D"]),
      exercises: z.array(importedExerciseSchema).min(1).max(10),
    }).strict()).min(1).max(30),
  }).strict(),
}).strict();

export type FormPlanImportPackage = z.infer<typeof packageSchema> & { version: typeof PLAN_IMPORT_VERSION };

export interface PlanImportIssue {
  code: string;
  message: string;
  sessionIndex?: number;
  exerciseIndex?: number;
}

export type PlanImportResult =
  | { ok: true; package: FormPlanImportPackage; draft: TrainingPlanDraft; resolved: ResolvedImportExercise[][] }
  | { ok: false; issues: PlanImportIssue[] };

export interface ResolvedImportExercise {
  exercise: ExerciseV03;
  variation: ExerciseVariationV03;
  alternatives: ExerciseVariationV03[];
  prescription: NonNullable<TrainingPlanDraft["sessions"][number]["intents"][number]["prescription"]>;
}

const normalized = (value: string) => value.trim().toLocaleLowerCase("en-US");

export function resolveExerciseReference(reference: string): { exercise: ExerciseV03; variation: ExerciseVariationV03 } | { error: "unknown" | "ambiguous" } {
  const key = normalized(reference);
  const exactVariations = exerciseLibraryV1.variations.filter(variation =>
    [variation.id, variation.nameZh, variation.nameEn].some(value => normalized(value) === key),
  );
  const exactExercises = exerciseLibraryV1.exercises.filter(exercise =>
    [exercise.id, exercise.nameZh, exercise.nameEn, ...exercise.aliases].some(value => normalized(value) === key),
  );
  const candidates = new Map<string, ExerciseVariationV03>();
  for (const variation of exactVariations) candidates.set(variation.id, variation);
  for (const exercise of exactExercises) {
    const variation = exerciseLibraryV1.variations.find(item => item.id === exercise.defaultVariationId);
    if (variation) candidates.set(variation.id, variation);
  }
  if (!candidates.size) return { error: "unknown" };
  if (candidates.size > 1) return { error: "ambiguous" };
  const variation = [...candidates.values()][0];
  const exercise = exerciseLibraryV1.exercises.find(item => item.id === variation.exerciseId);
  return exercise ? { exercise, variation } : { error: "unknown" };
}

export function parseAndValidatePlanImport(text: string): PlanImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFence(text));
  } catch {
    return { ok: false, issues: [{ code: "invalid_json", message: "无法解析方案。请完整复制 ChatGPT 生成的 FORM Plan Package。" }] };
  }
  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map(issue => ({
      code: "invalid_structure",
      message: friendlyZodMessage(issue.path, issue.message),
      sessionIndex: pathNumber(issue.path, "sessions"),
      exerciseIndex: pathNumber(issue.path, "exercises"),
    })) };
  }
  if (parsed.data.version !== PLAN_IMPORT_VERSION) {
    return { ok: false, issues: [{ code: "unsupported_version", message: `不支持方案版本“${parsed.data.version}”。当前仅支持 ${PLAN_IMPORT_VERSION}。` }] };
  }
  const pkg = parsed.data as FormPlanImportPackage;
  const issues: PlanImportIssue[] = [];
  checkContiguousOrder(pkg.plan.sessions.map(item => item.order), "Session", issues);
  const resolved = pkg.plan.sessions.map((session, sessionIndex) => {
    checkContiguousOrder(session.exercises.map(item => item.order), "动作", issues, sessionIndex);
    return session.exercises.map((item, exerciseIndex): ResolvedImportExercise | null => {
      const match = resolveExerciseReference(item.exercise);
      if ("error" in match) {
        issues.push({
          code: match.error === "ambiguous" ? "ambiguous_exercise" : "unknown_exercise",
          message: match.error === "ambiguous" ? `动作引用“${item.exercise}”有多个精确匹配，请使用 Variation ID。` : `找不到动作“${item.exercise}”。请使用 FORM Variation ID、规范名称或已知别名。`,
          sessionIndex, exerciseIndex,
        });
        return null;
      }
      const allowed = match.variation.allowedMeasurementModes ?? ["reps"];
      if (!allowed.includes(item.measurement)) {
        issues.push({ code: "unsupported_measurement", message: `${match.variation.nameZh} 不支持“${measurementLabel(item.measurement)}”计量。`, sessionIndex, exerciseIndex });
      }
      validatePrescription(item, issues, sessionIndex, exerciseIndex);
      const alternatives = (item.alternatives ?? []).flatMap(reference => {
        const alternative = resolveExerciseReference(reference);
        if ("error" in alternative) {
          issues.push({ code: alternative.error === "ambiguous" ? "ambiguous_alternative" : "unknown_alternative", message: `替代动作“${reference}”无法唯一匹配。`, sessionIndex, exerciseIndex });
          return [];
        }
        if (!(alternative.variation.allowedMeasurementModes ?? ["reps"]).includes(item.measurement)) {
          issues.push({ code: "alternative_measurement", message: `替代动作“${alternative.variation.nameZh}”不支持当前计量方式。`, sessionIndex, exerciseIndex });
        }
        return [alternative.variation];
      });
      const measurement: MeasurementSnapshot = {
        version: 1,
        types: [item.measurement],
        trackLoad: item.measurement === "reps" || item.loadKg !== undefined,
        ...(item.side ? { side: item.side } : {}),
      };
      return {
        ...match,
        alternatives,
        prescription: {
          measurement,
          sets: item.sets,
          targetReps: item.reps,
          targetDurationSeconds: item.durationSeconds,
          targetBreaths: item.breaths,
          targetLoad: item.loadKg,
          targetRPE: item.rpe,
          targetRIR: item.rir,
          restSeconds: item.restSeconds,
          tempo: item.tempo,
        },
      };
    }).filter((item): item is ResolvedImportExercise => Boolean(item));
  });
  if (issues.length) return { ok: false, issues };
  const draft: TrainingPlanDraft = {
    name: pkg.plan.name,
    goalSummary: pkg.plan.goalSummary,
    cycleName: pkg.plan.cycleName,
    cycleFocus: pkg.plan.cycleFocus,
    rationale: pkg.plan.rationale,
    plannedWeeks: pkg.plan.plannedWeeks,
    expectedSessionsPerWeek: pkg.plan.expectedSessionsPerWeek,
    sessions: [...pkg.plan.sessions].sort((a, b) => a.order - b.order).map((session, sortedSessionIndex) => ({
      name: session.title,
      purpose: session.purpose,
      warmupBlock: warmupBlocks[session.warmupProfile],
      order: session.order,
      intents: [...session.exercises].sort((a, b) => a.order - b.order).map((item) => {
        const originalIndex = pkg.plan.sessions.indexOf(session);
        const originalExerciseIndex = session.exercises.indexOf(item);
        const value = resolved[originalIndex][originalExerciseIndex];
        return {
          label: item.label ?? `${value.exercise.primaryMovementPattern ?? "辅助训练"} · ${value.exercise.trainingGoals[0] ?? "strength"}`,
          order: item.order,
          trainingRole: item.trainingRole,
          rotationJointFunctionIds: item.rotationJointFunctionIds as JointFunctionId[]|undefined,
          movementPattern: value.exercise.primaryMovementPattern ?? undefined,
          trainingGoal: value.exercise.trainingGoals[0],
          jointFunctionId: value.exercise.primaryJointFunctions[0]?.jointFunctionId,
          defaultVariationId: value.variation.id,
          explicitOptionIds: value.alternatives.map(alternative => alternative.id),
          prescription: value.prescription,
        };
      }),
    })),
  };
  // Same resolver used by Today; validation must prove the aggregate has a next Session.
  const now = new Date(0).toISOString();
  const next = resolveNextSession(draft.sessions.map((session, index) => ({
    id: `import-session-${index}`, userId: "validation", planId: "validation", name: session.name,
    purpose: session.purpose, order: session.order, intents: session.intents.map((intent, intentIndex) => ({
      id: `import-intent-${index}-${intentIndex}`, userId: "validation", sessionTemplateId: `import-session-${index}`,
      label: intent.label, order: intent.order, movementPattern: intent.movementPattern, trainingGoal: intent.trainingGoal,
      jointFunctionId: intent.jointFunctionId, defaultVariationId: intent.defaultVariationId,
      explicitOptionIds: intent.explicitOptionIds ?? [], prescription: intent.prescription, createdAt: now, updatedAt: now,
    })), warmupBlock: session.warmupBlock, createdAt: now, updatedAt: now,
  })), []);
  if (!next?.intents.length) return { ok: false, issues: [{ code: "today_unresolvable", message: "该方案无法生成 Today 的下一堂训练。" }] };
  return { ok: true, package: pkg, draft, resolved };
}

export async function validateAndApplyPlanImport(text: string, repository: Pick<PlanRepository, "importPlan">) {
  const result = parseAndValidatePlanImport(text);
  if (!result.ok) return result;
  const plan = await repository.importPlan(result.draft);
  return { ...result, plan };
}

export async function applyValidatedPlanImport(
  result: Extract<PlanImportResult, { ok: true }>,
  repository: Pick<PlanRepository, "importPlan" | "updatePlan">,
  choice: { kind: "overwrite"; planId: string } | { kind: "create" },
  activeRun?: WorkoutRunAggregate | null,
) {
  if (activeRun) throw new Error("请先完成或重置当前训练，再应用方案。");
  const plan = choice.kind === "overwrite"
    ? await repository.updatePlan(choice.planId, result.draft)
    : await repository.importPlan(result.draft);
  if (choice.kind === "overwrite" && plan.id !== choice.planId) throw new Error("覆盖后计划 ID 不一致，请刷新检查。");
  return plan;
}

export function formatImportedPrescription(item: FormPlanImportPackage["plan"]["sessions"][number]["exercises"][number]) {
  const value = item.measurement === "reps" ? `${item.reps} 次` : item.measurement === "duration" ? `${item.durationSeconds} 秒` : `${item.breaths} 次呼吸`;
  return `${item.sets} 组 × ${value}${item.side ? " / 每侧" : ""}${item.loadKg === undefined ? "" : ` · ${item.loadKg} kg`}`;
}

function validatePrescription(item: z.infer<typeof importedExerciseSchema>, issues: PlanImportIssue[], sessionIndex: number, exerciseIndex: number) {
  const values = [item.reps !== undefined, item.durationSeconds !== undefined, item.breaths !== undefined].filter(Boolean).length;
  const expected = item.measurement === "reps" ? item.reps : item.measurement === "duration" ? item.durationSeconds : item.breaths;
  if (expected === undefined || values !== 1) issues.push({
    code: "invalid_prescription",
    message: `${measurementLabel(item.measurement)}动作必须且只能填写对应的处方字段。`, sessionIndex, exerciseIndex,
  });
}

function checkContiguousOrder(values: number[], label: string, issues: PlanImportIssue[], sessionIndex?: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (new Set(values).size !== values.length || sorted.some((value, index) => value !== index)) {
    issues.push({ code: "invalid_order", message: `${label}顺序必须从 0 开始连续且不能重复。`, sessionIndex });
  }
}

function stripCodeFence(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1] ?? trimmed;
}

function friendlyZodMessage(path: Array<string | number>, fallback: string) {
  const location = path.length ? path.join(" → ") : "方案";
  return `${location} 的内容不完整或格式不正确（${fallback}）。`;
}

function pathNumber(path: Array<string | number>, key: string) {
  const index = path.indexOf(key);
  return index >= 0 && typeof path[index + 1] === "number" ? path[index + 1] as number : undefined;
}

function measurementLabel(value: ImportMeasurement) {
  return value === "reps" ? "次数" : value === "duration" ? "时长" : "呼吸次数";
}
