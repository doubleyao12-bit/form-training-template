import { seedExercises as v02SeedExercises } from "./data.v3";
import type { Exercise as ExerciseV02, ExerciseRelation as ExerciseRelationV02, JointFunctionId } from "./types";
import {
  EXERCISE_SCHEMA_VERSION, V02_STORAGE_KEY, V03_STORAGE_KEY,
  type DifficultyDimension, type ExerciseLibraryV03, type ExerciseRelation,
  type ExerciseV03, type ExerciseVariationV03, type JointFunctionContribution,
  type JointFunctionRole, type PrerequisiteScope, type ReviewFlag,
} from "./schema.v03";
import { tutorialFor } from "./exercise-metadata";

const DEFAULT_MIGRATED_AT = "2026-08-29T09:00:00+08:00";

const classificationReviewNotes: Record<string, string> = {
  "barbell-hip-thrust": "Review Required：Hip Thrust 是否应继续归入 Hip Hinge。V0.3 保持原分类。",
  "glute-bridge": "Review Required：Glute Bridge 是否应继续归入 Hip Hinge。V0.3 保持原分类。",
  "trap-bar-deadlift": "Review Required：Trap Bar Deadlift 可能表现为 Hip Hinge / Squat-Hinge 混合。V0.3 不创建 Hybrid Pattern。",
  "step-down": "Review Required：Step-Down 的主要任务可理解为 Squat 或减速控制。V0.3 保持 Squat。",
  "lateral-lunge": "Review Required：Lateral Lunge 的 Squat / 侧向移动边界仍待确认。V0.3 保持 Squat。",
  "forward-lunge": "Review Required：Forward Lunge 是否应保留次要减速模式仍待确认。V0.3 保持原值。",
  "walking-lunge": "Review Required：Walking Lunge 是否应保留次要 Locomotion 仍待确认。V0.3 保持原值。",
  "box-squat": "Review Required：Box Squat 应作为独立 Exercise 还是执行参数仍待确认。V0.3 保持独立 Exercise。",
};

const difficultyDimensions: Record<string, DifficultyDimension> = {
  "goblet-squat→front-squat": "technical",
  "split-squat→bulgarian-split-squat": "stability",
  "bulgarian-split-squat→split-squat": "stability",
  "dumbbell-romanian-deadlift→romanian-deadlift": "loadability",
  "single-leg-romanian-deadlift→kickstand-romanian-deadlift": "stability",
  "kickstand-romanian-deadlift→single-leg-romanian-deadlift": "stability",
  "barbell-hip-thrust→glute-bridge": "loadability",
  "glute-bridge→barbell-hip-thrust": "loadability",
  "single-leg-glute-bridge→glute-bridge": "stability",
  "cable-pull-through→barbell-good-morning": "technical",
  "pallof-press→跪姿帕洛夫静力支撑": "stability",
  "pallof-press→短力臂帕洛夫推": "loadability",
  "pallof-press→分腿跪姿帕洛夫推": "stability",
  "pallof-press→帕洛夫推加侧移": "technical",
  "lateral-bound→侧向跨步定格": "impact",
  "lateral-bound→低幅侧向跳": "impact",
  "lateral-bound→连续侧向跨步跳": "technical",
  "lateral-bound→侧向跨步跳接变向冲刺": "technical",
  "biceps-curl→弹力带弯举": "loadability",
  "biceps-curl→坐姿轻重量弯举": "technical",
  "biceps-curl→上斜哑铃弯举": "rangeOfMotion",
  "biceps-curl→交替弯举加离心控制": "technical",
};

function roleFor(exerciseId: string, jointFunctionId: JointFunctionId): JointFunctionRole {
  if (exerciseId === "step-down" && (jointFunctionId === "kneeExtension" || jointFunctionId === "hipExtension")) return "eccentric";
  if (jointFunctionId === "landingDeceleration") return "eccentric";
  if (["trunkAntiFlexion", "trunkAntiRotation", "lateralTrunkStability", "pelvicStability", "shoulderIsometricStability", "kneeIsometricStability"].includes(jointFunctionId)) return "isometric";
  if (["hipAbductionPropulsion", "tripleExtension", "anklePlantarflexion"].includes(jointFunctionId)) return "concentric";
  return "dynamic";
}

function migrateContributions(exerciseId: string, ids: JointFunctionId[]): JointFunctionContribution[] {
  return ids.map(jointFunctionId => ({ jointFunctionId, role: roleFor(exerciseId, jointFunctionId) }));
}

function prerequisiteScopeFor(_relation: ExerciseRelationV02): PrerequisiteScope {
  return "technical";
}

function migrateRelation(source: ExerciseV02, relation: ExerciseRelationV02): ExerciseRelation {
  const base = {
    targetExerciseId: relation.targetExerciseId,
    targetName: relation.targetName,
    status: relation.status,
    rationale: relation.rationale ?? "V0.2 关系未提供说明。",
  };
  if (relation.type === "prerequisite") return { ...base, type: relation.type, prerequisiteScope: prerequisiteScopeFor(relation) };
  if (relation.type === "easierVariation" || relation.type === "harderVariation") {
    const key = `${source.id}→${relation.targetExerciseId ?? relation.targetName}`;
    return { ...base, type: relation.type, difficultyDimension: difficultyDimensions[key] ?? "technical", reviewRequired: true };
  }
  return { ...base, type: relation.type };
}

function reviewFlagsFor(exercise: ExerciseV02): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const classificationNote = classificationReviewNotes[exercise.id];
  if (classificationNote) flags.push({ code: "movementPatternClassification", note: classificationNote });
  if (exercise.id === "45-degree-hip-extension") flags.push({ code: "compoundTypeClassification", note: "Review Required：髋主导背伸在不同执行方式下可能变成脊柱屈伸任务。" });
  if (exercise.id === "single-leg-romanian-deadlift") flags.push({ code: "variationLoadingPlacement", note: "Review Required：V0.2 未说明哑铃为同侧或对侧持有，迁移后保留 unspecified。" });
  if (exercise.id === "step-down") flags.push({ code: "jointFunctionRoleModel", note: "Review Required：将髋伸/膝伸标为 eccentric 是 V0.3 的最小表达，role 科学模型仍需 Review。" });
  return flags;
}

export function migrateV02ToV03(sourceExercises: ExerciseV02[], migratedAt = DEFAULT_MIGRATED_AT): ExerciseLibraryV03 {
  const sourceById = new Map(sourceExercises.map(exercise => [exercise.id, exercise]));
  const removedRelations: ExerciseLibraryV03["migrationReport"]["removedRelations"] = [];

  const exercises: ExerciseV03[] = sourceExercises.map(source => {
    const relations = source.relations.flatMap(relation => {
      const target = relation.targetExerciseId ? sourceById.get(relation.targetExerciseId) : undefined;
      if (relation.type === "sameFamily" && target && source.exerciseFamilyId && source.exerciseFamilyId === target.exerciseFamilyId) {
        removedRelations.push({ sourceExerciseId: source.id, relation, reason: "redundantWithExerciseFamily" });
        return [];
      }
      return [migrateRelation(source, relation)];
    });
    return {
      schemaVersion: EXERCISE_SCHEMA_VERSION,
      id: source.id, nameZh: source.nameZh, nameEn: source.nameEn, aliases: [...source.aliases],
      exerciseFamilyId: source.exerciseFamilyId,
      defaultVariationId: `${source.id}--legacy-default`,
      primaryMovementPattern: source.primaryMovementPattern,
      secondaryMovementPatterns: [...source.secondaryMovementPatterns],
      primaryJointFunctions: migrateContributions(source.id, source.primaryJointFunctions),
      secondaryJointFunctions: migrateContributions(source.id, source.secondaryJointFunctions),
      compoundType: source.compoundType,
      limbConfiguration: source.limbConfiguration,
      movementPlane: source.movementPlane,
      primaryMuscles: [...source.primaryMuscles], secondaryMuscles: [...source.secondaryMuscles],
      trainingGoals: [...source.trainingGoals], primaryCapacity: source.primaryCapacity,
      loadability: source.loadability, technicalComplexity: source.technicalComplexity,
      impactLevel: source.impactLevel, systemicFatiguePotential: source.systemicFatiguePotential,
      relations, reviewFlags: reviewFlagsFor(source), notes: source.notes,
      contraindicationNotes: source.contraindicationNotes, createdAt: source.createdAt, updatedAt: migratedAt,
    };
  });

  const variations: ExerciseVariationV03[] = sourceExercises.map(source => ({
    schemaVersion: EXERCISE_SCHEMA_VERSION,
    id: `${source.id}--legacy-default`, exerciseId: source.id,
    nameZh: "V0.2 默认执行方式", nameEn: "V0.2 Default Execution",
    equipment: [...source.equipment], loadingSymmetry: source.loadingSymmetry,
    loadPlacement: source.loadingSymmetry === "unloaded" ? "notApplicable" : "unspecified",
    loadTrackingType: source.loadingSymmetry === "unloaded" ? "bodyweight" : "externalLoad",
    stabilityDemand: source.stabilityDemand,
    ...tutorialFor(source.id),
    executionNotes: "由 V0.2 Exercise 字段无损迁移。具体负重位置若原数据未说明，不做推断。",
    isDefault: true, createdAt: source.createdAt, updatedAt: migratedAt,
  }));

  return {
    schemaVersion: EXERCISE_SCHEMA_VERSION,
    exercises,
    variations,
    migrationReport: {
      sourceSchemaVersion: "0.2", targetSchemaVersion: EXERCISE_SCHEMA_VERSION,
      migratedAt, sourceExerciseCount: sourceExercises.length,
      exerciseCount: exercises.length, variationCount: variations.length,
      movedFields: ["equipment", "loadingSymmetry", "stabilityDemand"],
      retainedExerciseFields: ["limbConfiguration", "movementPlane", "loadability", "technicalComplexity", "impactLevel", "systemicFatiguePotential"],
      removedRelations,
      reviewRequired: [
        "JointFunctionContribution.role 混合了肌肉收缩角色与关节运动描述，需运动科学 Review。",
        "所有 V0.2 easier/harder relation 已保留并增加 difficultyDimension，但仍标记 reviewRequired。",
        "所有原有分类争议均原样保留，未修改 movement pattern。",
        "V0.2 未记录具体负重位置；除 unloaded 外，迁移 Variation 使用 unspecified。",
      ],
    },
  };
}

export const exerciseLibraryV03 = migrateV02ToV03(v02SeedExercises);

export function migrateV03LocalStorage(storage: Pick<Storage, "getItem" | "setItem">): ExerciseLibraryV03 {
  const existing = storage.getItem(V03_STORAGE_KEY);
  if (existing) return JSON.parse(existing) as ExerciseLibraryV03;
  const legacy = storage.getItem(V02_STORAGE_KEY);
  const source = legacy ? JSON.parse(legacy) as ExerciseV02[] : v02SeedExercises;
  const migrated = migrateV02ToV03(source, new Date().toISOString());
  storage.setItem(V03_STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}
