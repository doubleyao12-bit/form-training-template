import type {
  EquipmentId, ExerciseFamilyId, JointFunctionId, Level, LimbConfiguration,
  LoadingSymmetry, MovementPattern, MuscleId, TrainingGoal,
} from "./types";

export const EXERCISE_SCHEMA_VERSION = "0.3" as const;
export const V02_STORAGE_KEY = "training-hub-exercises-v3";
export const V03_STORAGE_KEY = "training-hub-library-v4";

export type JointFunctionRole = "concentric" | "eccentric" | "isometric" | "dynamic";

/**
 * Review required: concentric/eccentric describe muscle action, while dynamic
 * describes joint motion. V0.3 keeps this deliberately small until reviewed.
 */
export interface JointFunctionContribution {
  jointFunctionId: JointFunctionId;
  role: JointFunctionRole;
}

export type DifficultyDimension =
  | "loadability"
  | "balance"
  | "rangeOfMotion"
  | "technical"
  | "stability"
  | "impact";

export type PrerequisiteScope = "technical" | "mobility" | "stability" | "strength";

interface RelationBase {
  targetExerciseId: string | null;
  targetName: string;
  status: "resolved" | "unresolved";
  rationale: string;
}

export type ExerciseRelation =
  | (RelationBase & { type: "sameFamily" | "alternative" })
  | (RelationBase & {
      type: "prerequisite";
      prerequisiteScope: PrerequisiteScope;
    })
  | (RelationBase & {
      type: "easierVariation" | "harderVariation";
      difficultyDimension: DifficultyDimension;
      reviewRequired: true;
    });

export type ReviewFlagCode =
  | "movementPatternClassification"
  | "compoundTypeClassification"
  | "variationLoadingPlacement"
  | "jointFunctionRoleModel";

export interface ReviewFlag {
  code: ReviewFlagCode;
  note: string;
}

/** Stable movement structure and training properties. */
export interface ExerciseV03 {
  schemaVersion: typeof EXERCISE_SCHEMA_VERSION;
  id: string;
  nameZh: string;
  nameEn: string;
  aliases: string[];
  exerciseFamilyId: ExerciseFamilyId | null;
  defaultVariationId: string;
  primaryMovementPattern: MovementPattern | null;
  secondaryMovementPatterns: MovementPattern[];
  primaryJointFunctions: JointFunctionContribution[];
  secondaryJointFunctions: JointFunctionContribution[];
  compoundType: "复合" | "孤立";
  limbConfiguration: LimbConfiguration;
  movementPlane: "矢状面" | "额状面" | "水平面" | "多平面";
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  trainingGoals: TrainingGoal[];
  /** Display copy only. Never use for filtering, search, or programming logic. */
  primaryCapacity: string;
  loadability: Level;
  technicalComplexity: Level;
  impactLevel: Level;
  /** Potential under typical training conditions, not actual user fatigue. */
  systemicFatiguePotential: Level;
  relations: ExerciseRelation[];
  reviewFlags: ReviewFlag[];
  notes: string;
  contraindicationNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type LoadPlacement =
  | "central"
  | "bilateral"
  | "ipsilateral"
  | "contralateral"
  | "notApplicable"
  | "unspecified";

export type LoadTrackingType = "externalLoad" | "bodyweight" | "assistedBodyweight";
export type TutorialSource = "NSCA" | "NASM" | "ACE" | "other";

/** Concrete equipment, loading, and stability configuration for an exercise. */
export interface ExerciseVariationV03 {
  /** Optional discovery text, never identity or authorization. */
  aliases?: string[];
  allowedMeasurementModes?: import('./domain/training').MeasurementSnapshot['types'];
  preparationIntents?: import("./domain/training").WarmupIntent[];
  schemaVersion: typeof EXERCISE_SCHEMA_VERSION;
  id: string;
  exerciseId: string;
  nameZh: string;
  nameEn: string;
  equipment: EquipmentId[];
  loadingSymmetry: LoadingSymmetry;
  loadPlacement: LoadPlacement;
  /** Defines how actualLoad is interpreted without changing workout-set storage. */
  loadTrackingType: LoadTrackingType;
  stabilityDemand: Level;
  tutorialUrl?: string;
  tutorialSource?: TutorialSource;
  executionNotes: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RemovedRelationAudit {
  sourceExerciseId: string;
  relation: import("./types").ExerciseRelation;
  reason: "redundantWithExerciseFamily";
}

export interface MigrationReportV03 {
  sourceSchemaVersion: "0.2";
  targetSchemaVersion: typeof EXERCISE_SCHEMA_VERSION;
  migratedAt: string;
  sourceExerciseCount: number;
  exerciseCount: number;
  variationCount: number;
  movedFields: Array<"equipment" | "loadingSymmetry" | "stabilityDemand">;
  retainedExerciseFields: Array<
    "limbConfiguration" | "movementPlane" | "loadability" | "technicalComplexity" |
    "impactLevel" | "systemicFatiguePotential"
  >;
  removedRelations: RemovedRelationAudit[];
  reviewRequired: string[];
}

export interface ExerciseLibraryV03 {
  schemaVersion: typeof EXERCISE_SCHEMA_VERSION;
  exercises: ExerciseV03[];
  variations: ExerciseVariationV03[];
  migrationReport: MigrationReportV03;
}

export const primaryCapacityCopyRules = {
  purpose: "仅用于前台快速说明动作主要训练什么。",
  maxConcepts: 2,
  preferredPatterns: [
    "部位或动力链 + 力量",
    "单腿 + 力量/稳定/控制",
    "方向 + 力量/减速/移动",
  ],
  avoid: ["专业分类编码", "处方信息", "用户能力判断", "算法或筛选条件"],
} as const;
