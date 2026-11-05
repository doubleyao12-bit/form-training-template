import type { TrainingPlanAggregate, WorkoutRunAggregate, WorkoutSet } from "./domain/training";
import { estimateOneRM, evidenceMeasurement } from "./performance-profile";
import { getVariationDisplay, getVariationMetadata } from "./exercise-display";

export type ReviewArea = "adherence" | "progress" | "stagnation" | "consistency" | "coverage" | "prescription";
export interface ReviewEvidence {
  id: string;
  area: ReviewArea;
  title: string;
  detail: string;
  runIds: string[];
  planId?: string;
}
export interface ReviewFinding { title: string; detail: string; evidenceIds: string[] }
export interface TrainingReview {
  period: "4W";
  planId: string;
  completedSessions: number;
  expectedSessions: number | null;
  performanceSessions: number;
  comparableActions: number;
  evidence: ReviewEvidence[];
  flags: ReviewFinding[];
  opportunities: ReviewFinding[];
}

const completed = (run: WorkoutRunAggregate) => run.status === "completed" && !run.revertedAt && Boolean(run.completedAt);
const valid = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value > 0;
function bestSetScore(set: WorkoutSet, variationId: string): { kind: string; value: number; context: string } | null {
  if (!set.completed) return null;
  const measurement = evidenceMeasurement(set);
  const resistance = measurement.trackLoad ? `:${set.actualLoad??"unknown"}kg` : ":no-load";
  const side = measurement.side??"both";
  if (measurement.types.includes("duration") && valid(set.actualDurationSeconds)) return {kind:"秒数",value:set.actualDurationSeconds,context:`duration${resistance}:${side}`};
  if (measurement.types.includes("breaths") && valid(set.actualBreaths)) return {kind:"呼吸",value:set.actualBreaths,context:`breaths${resistance}:${side}`};
  if (measurement.types.includes("reps") && valid(set.actualReps)) {
    const loadType = getVariationMetadata(variationId)?.loadTrackingType;
    const estimated = loadType==="externalLoad" ? estimateOneRM(set.actualLoad,set.actualReps) : undefined;
    if (estimated) return {kind:"估算 1RM",value:estimated,context:`external:${side}`};
    return {kind:"次数",value:set.actualReps,context:`reps:${loadType??"unknown"}${resistance}:${side}`};
  }
  return null;
}

/** Pure review of immutable completed evidence; never mutates a Plan. */
export function buildTrainingReview(plan: TrainingPlanAggregate, history: WorkoutRunAggregate[], now = new Date()): TrainingReview {
  const start = now.getTime() - 28 * 86400000;
  const baselineStart = start - 28 * 86400000;
  const performanceRuns = history.filter(run => run.userId === plan.userId && completed(run) && Date.parse(run.completedAt!) >= baselineStart && Date.parse(run.completedAt!) <= now.getTime())
    .sort((a,b) => Date.parse(a.completedAt!) - Date.parse(b.completedAt!));
  const recentPerformance = performanceRuns.filter(run => Date.parse(run.completedAt!) >= start);
  const runs = recentPerformance.filter(run => run.sourcePlanId === plan.id);
  const planStart = Date.parse(plan.startDate ?? plan.createdAt);
  const activeDays = Number.isFinite(planStart) ? Math.max(0, Math.min(28, Math.ceil((now.getTime()-planStart)/86400000))) : 28;
  const expectedSessions = plan.expectedSessionsPerWeek ? Math.ceil(plan.expectedSessionsPerWeek * activeDays / 7) : null;
  const evidence: ReviewEvidence[] = [];
  const flags: ReviewFinding[] = [];
  const opportunities: ReviewFinding[] = [];
  const add = (area: ReviewArea, title: string, detail: string, runIds: string[], planId?: string) => {
    const item = { id: `${area}-${evidence.length}`, area, title, detail, runIds, planId };
    evidence.push(item); return item.id;
  };
  const adherenceId = add("adherence","计划完成度",
    expectedSessions === null ? `近 4 周完成 ${runs.length} 次；计划未设置每周目标。` : `近 4 周完成 ${runs.length}/${expectedSessions} 次计划训练。`,
    runs.map(run => run.id),plan.id);
  if (runs.length && expectedSessions !== null && runs.length < expectedSessions * 0.7)
    flags.push({title:"计划完成度偏低",detail:"先稳定训练频率，再判断计划本身的效果。",evidenceIds:[adherenceId]});
  const weeks = new Set(recentPerformance.map(run => Math.floor((Date.parse(run.completedAt!) - start) / (7*86400000))));
  const consistencyId = add("consistency","训练连续性",`近 4 周有 ${weeks.size}/4 周完成训练。`,recentPerformance.map(run=>run.id));
  if (recentPerformance.length && weeks.size < 3) opportunities.push({title:"提高连续性",detail:"尽量让训练分布在更多周，而不是集中补课。",evidenceIds:[consistencyId]});

  const byVariation = new Map<string, {variationId:string; exposures:Array<{run:WorkoutRunAggregate; score:{kind:string;value:number;context:string}}> }>();
  const performedPatterns = new Set<string>();
  let comparedSets = 0, metTargets = 0, rpeCount = 0, rpeAbove = 0;
  const prescriptionRunIds = new Set<string>();
  for (const run of performanceRuns) for (const exercise of run.exercises) {
    if (exercise.intentSnapshot.preparationIntent) continue;
    if (run.sourcePlanId === plan.id && Date.parse(run.completedAt!) >= start && exercise.intentSnapshot.movementPattern) performedPatterns.add(exercise.intentSnapshot.movementPattern);
    const variationId=exercise.actualVariationId??exercise.selectedVariationId;
    const scores = exercise.sets.map(set=>bestSetScore(set,variationId)).filter((item): item is NonNullable<typeof item> => Boolean(item));
    for (const score of scores) {
      const key=`${variationId}:${score.context}`;
      const group=byVariation.get(key)??{variationId,exposures:[]};
      const previous=group.exposures.find(item=>item.run.id===run.id);
      if (previous) { if (score.value>previous.score.value) previous.score=score; }
      else group.exposures.push({run,score});
      byVariation.set(key,group);
    }
    if (run.sourcePlanId !== plan.id || Date.parse(run.completedAt!) < start) continue;
    for (const set of exercise.sets.filter(item=>item.completed)) {
      const mode=evidenceMeasurement(set).types[0];
      const actual=mode==="duration"?set.actualDurationSeconds:mode==="breaths"?set.actualBreaths:set.actualReps;
      const target=mode==="duration"?set.targetDurationSeconds:mode==="breaths"?set.targetBreaths:set.targetReps;
      if (valid(actual) && valid(target)) { comparedSets++; if (actual>=target) metTargets++; prescriptionRunIds.add(run.id); }
      if (valid(set.actualRPE) && valid(set.targetRPE)) { rpeCount++; if (set.actualRPE>set.targetRPE+1) rpeAbove++; prescriptionRunIds.add(run.id); }
    }
  }
  let comparableActions = 0;
  for (const {variationId,exposures} of byVariation.values()) {
    if (exposures.length < 2) continue;
    const first=exposures[0],last=exposures.at(-1)!;
    if (Date.parse(last.run.completedAt!) < start) continue;
    if (first.score.kind!==last.score.kind) continue;
    comparableActions++;
    const delta=(last.score.value-first.score.value)/first.score.value;
    const name=getVariationDisplay(variationId).nameZh;
    const id=add(delta>0.02?"progress":"stagnation",name,
      `${first.score.kind}：${first.score.value.toFixed(1)} → ${last.score.value.toFixed(1)}；${exposures.length} 次有效暴露。`,
      exposures.map(item=>item.run.id));
    if (exposures.length>=3 && delta<=0.02)
      flags.push({title:"近期未见明显提升",detail:`${name} 连续 ${exposures.length} 次记录未超过首次表现 2%。先核对疲劳与动作质量。`,evidenceIds:[id]});
    else if (delta>0.02) opportunities.push({title:"保持当前渐进节奏",detail:`${name} 的 ${first.score.kind} 有记录上的提升。`,evidenceIds:[id]});
  }
  const plannedPatterns = new Set(plan.sessions.flatMap(session=>session.intents.map(intent=>intent.movementPattern).filter((value): value is NonNullable<typeof value>=>Boolean(value))));
  const missing = [...plannedPatterns].filter(pattern=>!performedPatterns.has(pattern));
  const coverageId=add("coverage","动作模式覆盖",missing.length?`近 4 周尚未记录：${missing.join("、")}。`:"已训练动作覆盖当前计划的全部主要模式。",runs.map(run=>run.id),plan.id);
  if (runs.length>=2 && missing.length) opportunities.push({title:"检查动作模式覆盖",detail:"这是基于已完成训练的覆盖提示，不代表必须增加新动作。",evidenceIds:[coverageId]});
  if (comparedSets || rpeCount) {
    const id=add("prescription","处方响应",
      `${comparedSets? `${metTargets}/${comparedSets} 组达到目标`:"无可比目标"}；${rpeCount?`${rpeAbove}/${rpeCount} 组 RPE 高出目标 1 以上`:"无 RPE 对照"}。`,
      [...prescriptionRunIds]);
    if (comparedSets>=3 && metTargets/comparedSets<0.6) flags.push({title:"多数组未达到目标",detail:"核对处方负荷与实际恢复状态。",evidenceIds:[id]});
    if (rpeCount>=3 && rpeAbove/rpeCount>0.5) flags.push({title:"主观强度高于预期",detail:"优先检查负荷与恢复，不自动调整计划。",evidenceIds:[id]});
  }
  return {period:"4W",planId:plan.id,completedSessions:runs.length,expectedSessions,performanceSessions:recentPerformance.length,comparableActions,evidence,flags,opportunities};
}
