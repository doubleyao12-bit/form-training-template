import type { MovementPattern, MuscleId } from "./types";
import type { ExerciseV03 } from "./schema.v03";
export const movementPatternLabels: Record<MovementPattern,string> = {"Squat":"蹲","Hip Hinge":"髋铰链","Horizontal Push":"水平推","Vertical Push":"垂直推","Horizontal Pull":"水平拉","Vertical Pull":"垂直拉","Carry":"负重移动","Trunk / Core":"躯干 / 核心","Jump / Landing":"跳跃与落地","Throw / Ballistic":"投掷与弹震发力","Locomotion":"移动","Deceleration / Change of Direction":"减速与变向"};

export const exerciseBrowseCategories = [
  {id:"squat",label:"蹲",en:"Squat"},
  {id:"hinge",label:"髋铰链",en:"Hip Hinge"},
  {id:"lunge-unilateral",label:"弓步 / 单腿",en:"Lunge / Unilateral"},
  {id:"horizontal-push",label:"水平推",en:"Horizontal Push"},
  {id:"horizontal-pull",label:"水平拉",en:"Horizontal Pull"},
  {id:"vertical-push",label:"垂直推",en:"Vertical Push"},
  {id:"vertical-pull",label:"垂直拉",en:"Vertical Pull"},
  {id:"core-control",label:"核心稳定 / 躯干控制",en:"Core Stability / Trunk Control"},
  {id:"rotation-integration",label:"旋转 / 全身整合",en:"Rotation / Integration"},
  {id:"locomotion-carry",label:"移动 / 负重移动",en:"Locomotion / Carry"},
  {id:"jump-power",label:"跳跃 / 爆发",en:"Jump / Power"},
  {id:"mobility-preparation",label:"活动度 / 动作准备",en:"Mobility / Preparation"},
] as const;
export type ExerciseBrowseCategoryId = typeof exerciseBrowseCategories[number]["id"];

export function exerciseBrowseCategory(exercise: ExerciseV03): ExerciseBrowseCategoryId | null {
  const family = exercise.exerciseFamilyId ?? "";
  if (["squat-split-stance","squat-lunge","squat-step","squat-single-leg"].includes(family)) return "lunge-unilateral";
  if (["integrated-get-up","full-body-integrated","core-integrated","core-rotation"].includes(family) || exercise.primaryJointFunctions.some(item=>item.jointFunctionId==="trunkRotation")) return "rotation-integration";
  if (family.startsWith("warmup-") || family.startsWith("recovery-") || family === "mobility-control" || family === "shoulder-control") return "mobility-preparation";
  const patternMap: Partial<Record<MovementPattern,ExerciseBrowseCategoryId>> = {
    "Squat":"squat", "Hip Hinge":"hinge", "Horizontal Push":"horizontal-push", "Vertical Push":"vertical-push",
    "Horizontal Pull":"horizontal-pull", "Vertical Pull":"vertical-pull", "Trunk / Core":"core-control",
    "Carry":"locomotion-carry", "Locomotion":"locomotion-carry", "Jump / Landing":"jump-power", "Throw / Ballistic":"jump-power",
    "Deceleration / Change of Direction":"jump-power",
  };
  return exercise.primaryMovementPattern ? patternMap[exercise.primaryMovementPattern] ?? null : null;
}

export const exerciseBodyCategories = [
  {id:"chest",label:"胸",en:"Chest"}, {id:"back",label:"背",en:"Back"},
  {id:"shoulders",label:"肩",en:"Shoulders"}, {id:"arms",label:"手臂",en:"Arms"},
  {id:"core",label:"核心",en:"Core"}, {id:"glutes",label:"臀",en:"Glutes"}, {id:"hips",label:"髋周 / 内收",en:"Hip / Adductors"},
  {id:"quadriceps",label:"股四头",en:"Quadriceps"}, {id:"hamstrings",label:"腘绳肌",en:"Hamstrings"},
  {id:"calves",label:"小腿",en:"Calves"},
] as const;
export type ExerciseBodyCategoryId = typeof exerciseBodyCategories[number]["id"];

const bodyMuscles: Record<ExerciseBodyCategoryId,ReadonlySet<MuscleId>> = {
  chest:new Set(["pectoralisMajor","serratusAnterior"]),
  back:new Set(["latissimusDorsi","trapezius","rhomboids","erectorSpinae"]),
  shoulders:new Set(["anteriorDeltoid","medialDeltoid","posteriorDeltoid","rotatorCuff"]),
  arms:new Set(["bicepsBrachii","brachialis","brachioradialis","tricepsBrachii","forearmFlexors"]),
  core:new Set(["obliques","transversusAbdominis","rectusAbdominis","lateralTrunkFlexors","quadratusLumborum"]),
  glutes:new Set(["gluteusMaximus","gluteusMedius"]), hips:new Set(["adductors","hipFlexors"]),
  quadriceps:new Set(["quadriceps"]), hamstrings:new Set(["hamstrings"]),
  calves:new Set(["gastrocnemius","soleus"]),
};

export function exerciseBodyCategoryIds(exercise: ExerciseV03): ExerciseBodyCategoryId[] {
  const muscles=new Set(exercise.primaryMuscles);
  return exerciseBodyCategories.filter(category=>[...bodyMuscles[category.id]].some(muscle=>muscles.has(muscle))).map(category=>category.id);
}
