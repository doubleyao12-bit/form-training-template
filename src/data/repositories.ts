import type { HistoryQuery, PreviousPerformance, ReplacementReason, TrainingPlaybook, TrainingPlaybookDraft, TrainingPlanAggregate, TrainingPlanDraft, WorkoutRevertReason, WorkoutRunAggregate, WorkoutRunSummary, WorkoutSet, WorkoutSetPatch } from "../domain/training";

export interface PlanRepository {
  getActivePlaybook(): Promise<TrainingPlaybook | null>;
  saveProgram(playbook: TrainingPlaybookDraft, plan: TrainingPlanDraft): Promise<{ playbook: TrainingPlaybook; plan: TrainingPlanAggregate }>;
  getActivePlan(progression?: Promise<Array<Pick<WorkoutRunAggregate, "sourceSessionTemplateId" | "completedAt" | "revertedAt">>>): Promise<TrainingPlanAggregate | null>;
  listPlans(includeDeleted?: boolean): Promise<TrainingPlanAggregate[]>;
  setActivePlan(id: string): Promise<TrainingPlanAggregate>;
  getPlan(id: string): Promise<TrainingPlanAggregate | null>;
  createPlan(draft: TrainingPlanDraft, status?: "active" | "archived"): Promise<TrainingPlanAggregate>;
  importPlan(draft: TrainingPlanDraft): Promise<TrainingPlanAggregate>;
  renamePlan(id: string, name: string): Promise<TrainingPlanAggregate>;
  updatePlan(id: string, draft: TrainingPlanDraft): Promise<TrainingPlanAggregate>;
  deletePlan(id: string): Promise<void>;
}

export interface WorkoutRepository {
  prepareRun(sessionTemplateId: string): Promise<WorkoutRunAggregate>;
  getActiveRun(): Promise<WorkoutRunAggregate | null>;
  selectExercise(workoutExerciseId: string, variationId: string, reason?: ReplacementReason, note?: string, options?: {scope?:import('../domain/training').WorkoutChangeScope;adjustment?:import('../replacement-engine').MeasurementAdjustment}): Promise<void>;
  addExercise(runId:string,variationId:string,scope?:import('../domain/training').WorkoutChangeScope):Promise<WorkoutRunAggregate>;
  removeExercise(exerciseId:string,scope?:import('../domain/training').WorkoutChangeScope):Promise<WorkoutRunAggregate>;
  startRun(runId: string): Promise<void>;
  reorderExercises(runId: string, ids: string[], expectedVersion: number): Promise<WorkoutRunAggregate>;
  updateSet(setId: string, patch: WorkoutSetPatch): Promise<WorkoutSet>;
  addSet(workoutExerciseId: string, id?: string): Promise<WorkoutSet>;
  deleteSet(setId: string): Promise<void>;
  completeExercise(workoutExerciseId: string): Promise<void>;
  getLastPerformance(variationId: string, measurement?: import('../domain/training').MeasurementSnapshot): Promise<PreviousPerformance | null>;
  completeRun(runId: string, expectedVersion: number): Promise<void>;
  abandonRun(runId: string, expectedVersion: number): Promise<void>;
  revertLastCompletedRun(runId: string, reason: WorkoutRevertReason, expectedVersion: number): Promise<WorkoutRunSummary>;
}

export interface HistoryRepository {
  listPerformanceEvidence(variationId: string): Promise<import('../performance-profile').PerformanceEvidence[]>;
  listProgressionRuns(): Promise<Array<Pick<WorkoutRunAggregate, "sourceSessionTemplateId" | "completedAt" | "revertedAt">>>;
  listRuns(query?: HistoryQuery): Promise<WorkoutRunSummary[]>;
  getRun(id: string): Promise<WorkoutRunAggregate | null>;
}

export interface TrainingRepositories {
  plans: PlanRepository;
  workouts: WorkoutRepository;
  history: HistoryRepository;
}
