import type { JointFunctionId, MovementPattern, TrainingGoal } from "../types";

export type PlanStatus = "active" | "archived" | "deleted";
export type PlaybookStatus = "active" | "archived";
export type WorkoutRunStatus = "prepared" | "inProgress" | "completed" | "abandoned";
export type WorkoutRevertReason = "accidentalCompletion" | "other";
export type WorkoutExerciseStatus = "pending" | "inProgress" | "completed" | "skipped";
export type ReplacementReason = "equipmentUnavailable" | "painOrDiscomfort" | "difficultyAdjustment" | "preference" | "coachInstruction" | "other";
export type TrainingRole = "anchor" | "rotation" | "optional";
export type WorkoutChangeScope = "workout" | "plan";

export interface TrainingPlaybook {
  id: string;
  userId: string;
  name: string;
  version: string;
  status: PlaybookStatus;
  positioning: string;
  corePrinciples: string[];
  organizationRules: string[];
  frequencyRules: Array<{ frequency: number; approach: string }>;
  planChangeRules: string[];
  effectivenessCriteria: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingPlaybookDraft extends Omit<TrainingPlaybook, "id" | "userId" | "createdAt" | "updatedAt"> {}

export interface SessionDesignNotes {
  primaryAdaptations: string[];
  secondaryCapacities: string[];
  rationale: string;
  sequenceLogic: string[];
  recoveryLoad: "Lower High" | "Lower Low" | "Integrated / Moderate";
  hypothesis?: string;
  reviewRequired?: boolean;
  toleranceGuidance?: string;
}

export type WarmupIntent =
  | "breathingTrunkPelvisControl" | "hipMobility" | "adductorMobility"
  | "squatPatternPreparation" | "hingePatternPreparation" | "thoracicMobility"
  | "scapularControl" | "upperPushPullPreparation" | "unilateralControl"
  | "lateralMovementPreparation" | "powerElasticPreparation";

export interface WarmupExerciseTemplate {
  id: string;
  warmupIntent: WarmupIntent;
  defaultVariationId: string;
  replacementVariationIds: string[];
  sets?: number;
  reps?: string;
  breaths?: string;
  side?: "eachSide";
  cue: string;
  order: number;
}

export interface WarmupBlock {
  id: string;
  version: "0.1";
  title: string;
  focus: string;
  defaultRounds: number;
  exercises: WarmupExerciseTemplate[];
}

export interface TrainingPlan {
  id: string;
  userId: string;
  name: string;
  status: PlanStatus;
  goalSummary?: string;
  cycleName?: string;
  cycleFocus?: string;
  playbookId?: string;
  rationale?: string;
  plannedWeeks?: number;
  expectedSessionsPerWeek?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionTemplate {
  id: string;
  userId: string;
  planId: string;
  name: string;
  purpose?: string;
  designNotes?: SessionDesignNotes;
  warmupBlock?: WarmupBlock;
  order: number;
  intents: TrainingIntent[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingPrescription {
  measurement?: MeasurementSnapshot;
  targetDurationSeconds?: number;
  targetBreaths?: number;
  sets?: number;
  targetLoad?: number;
  targetReps?: number;
  targetRPE?: number;
  targetRIR?: number;
  restSeconds?: number;
  tempo?: string;
}

export interface TrainingIntent {
  trainingRole?: TrainingRole;
  rotationJointFunctionIds?: JointFunctionId[];
  id: string;
  userId: string;
  sessionTemplateId: string;
  label: string;
  order: number;
  movementPattern?: MovementPattern;
  trainingGoal?: TrainingGoal;
  jointFunctionId?: JointFunctionId;
  defaultVariationId: string;
  explicitOptionIds: string[];
  prescription?: TrainingPrescription;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingPlanAggregate extends TrainingPlan {
  sessions: SessionTemplate[];
}

export interface TrainingPlanDraft {
  name: string;
  goalSummary?: string;
  cycleName?: string;
  cycleFocus?: string;
  playbookId?: string;
  rationale?: string;
  plannedWeeks?: number;
  expectedSessionsPerWeek?: number;
  startDate?: string;
  endDate?: string;
  sessions: Array<{
    id?: string;
    name: string;
    purpose?: string;
    designNotes?: SessionDesignNotes;
    warmupBlock?: WarmupBlock;
    order: number;
    intents: Array<{
      id?: string;
      trainingRole?: TrainingRole;
      rotationJointFunctionIds?: JointFunctionId[];
      label: string;
      order: number;
      movementPattern?: MovementPattern;
      trainingGoal?: TrainingGoal;
      jointFunctionId?: JointFunctionId;
      defaultVariationId: string;
      explicitOptionIds?: string[];
      prescription?: TrainingPrescription;
    }>;
  }>;
}

export interface SessionTemplateSnapshot {
  cycle?: TrainingCycleSnapshot;
  warmupBlock?: WarmupBlock;
  name: string;
  purpose?: string;
  order: number;
  capturedAt: string;
  toleranceGuidance?: string;
}

export interface TrainingIntentSnapshot {
  trainingRole?: TrainingRole;
  rotationJointFunctionIds?: JointFunctionId[];
  preparationIntent?: WarmupIntent;
  label: string;
  order: number;
  movementPattern?: MovementPattern;
  trainingGoal?: TrainingGoal;
  jointFunctionId?: JointFunctionId;
  defaultVariationId: string;
  explicitOptionIds: string[];
  prescription?: TrainingPrescription;
}

/** Frozen cycle choices are copied into each occurrence, never backfilled into history. */
export interface TrainingCycleSnapshot {
  id: string;
  number: number;
  sessionIds: string[];
  selections: Record<string, { variationId: string; defaultVariationId: string; prescription?: TrainingPrescription }>;
}

export interface ExerciseDisplaySnapshot {
  exerciseId: string;
  variationId: string;
  nameZh: string;
  nameEn: string;
}

export interface WorkoutSet {
  measurementSnapshot?: MeasurementSnapshot;
  targetDurationSeconds?: number;
  actualDurationSeconds?: number;
  targetBreaths?: number;
  actualBreaths?: number;
  id: string;
  userId: string;
  workoutExerciseId: string;
  order: number;
  targetLoad?: number;
  targetReps?: number;
  targetRPE?: number;
  targetRIR?: number;
  restSeconds?: number;
  tempo?: string;
  actualLoad?: number;
  actualReps?: number;
  actualRPE?: number;
  actualRIR?: number;
  completed: boolean;
  note?: string;
  version: number;
  updatedAt: string;
}

export interface PreviousPerformance {
  completedAt: string;
  sets: Array<Pick<WorkoutSet, "actualLoad" | "actualReps" | "actualRPE" | "actualRIR" | "actualDurationSeconds" | "actualBreaths" | "measurementSnapshot">>;
}

export interface WorkoutExercise {
  id: string;
  userId: string;
  workoutRunId: string;
  sourceIntentId?: string;
  order: number;
  intentSnapshot: TrainingIntentSnapshot;
  defaultVariationId: string;
  selectedVariationId: string;
  actualVariationId?: string;
  replacementReason?: ReplacementReason;
  replacementNote?: string;
  exerciseSnapshot: ExerciseDisplaySnapshot;
  status: WorkoutExerciseStatus;
  sets: WorkoutSet[];
}

export interface WorkoutRunAggregate {
  id: string;
  userId: string;
  sourcePlanId?: string;
  sourceSessionTemplateId?: string;
  status: WorkoutRunStatus;
  sessionSnapshot: SessionTemplateSnapshot;
  exercises: WorkoutExercise[];
  startedAt?: string;
  completedAt?: string;
  revertedAt?: string;
  revertReason?: WorkoutRevertReason;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementSnapshot {
  version: 1;
  types: Array<"reps" | "duration" | "breaths">;
  trackLoad: boolean;
  side?: "eachSide";
}

export type WorkoutSetPatch = { [K in "actualLoad" | "actualReps" | "actualDurationSeconds" | "actualBreaths" | "actualRPE" | "actualRIR"]?: number | null } & Partial<Pick<WorkoutSet, "completed" | "note" | "measurementSnapshot">> & { version: number };

export interface HistoryQuery { limit?: number; before?: string }
export interface WorkoutRunSummary extends Omit<WorkoutRunAggregate, "exercises"> { exerciseCount: number }
