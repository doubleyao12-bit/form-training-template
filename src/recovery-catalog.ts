import type { ExerciseV03, ExerciseVariationV03 } from "./schema.v03";
import type { EquipmentId, ExerciseFamilyId, JointFunctionId, LimbConfiguration, LoadingSymmetry, MovementPattern, MuscleId, TrainingGoal } from "./types";

type Spec = {
  id: string; zh: string; en: string; family: ExerciseFamilyId; pattern: MovementPattern | null;
  joints: JointFunctionId[]; muscles: MuscleId[]; equipment: EquipmentId[]; goals: TrainingGoal[];
  capacity: string; note: string; limb?: LimbConfiguration; symmetry?: LoadingSymmetry;
  tutorialUrl: string; tutorialSource: "NSCA" | "NASM" | "ACE" | "other";
};

const createdAt = "2026-09-15T00:00:00+08:00";
const specs: Spec[] = [
  { id:"lateral-band-walk", zh:"弹力带侧向走", en:"Lateral Band Walk", family:"recovery-hip-control", pattern:"Locomotion", joints:["hipAbductionPropulsion","pelvicStability"], muscles:["gluteusMedius","gluteusMaximus"], equipment:["resistanceBand"], goals:["strength","stability","motorControl"], capacity:"髋外展力量与骨盆稳定", note:"保持轻微屈髋屈膝与弹力带张力，向侧方连续小步移动。", limb:"alternating", symmetry:"symmetric", tutorialUrl:"", tutorialSource:"NASM" },
  { id:"standing-hip-abduction", zh:"站姿髋外展", en:"Standing Hip Abduction", family:"recovery-hip-control", pattern:null, joints:["hipAbductionPropulsion","pelvicStability"], muscles:["gluteusMedius"], equipment:["resistanceBand"], goals:["strength","stability","motorControl"], capacity:"髋外展力量与单腿稳定", note:"站立保持骨盆水平，将非支撑腿向侧方抬起并控制返回。", limb:"unilateral", symmetry:"unilateral", tutorialUrl:"https://www.acefitness.org/resources/pros/expert-articles/6315/8-hip-strengthening-exercises-using-the-versa-loop/", tutorialSource:"ACE" },
  { id:"single-leg-knee-drive-hold", zh:"单腿站立提膝等长", en:"Single-Leg Knee-Drive Hold", family:"recovery-hip-control", pattern:null, joints:["hipFlexion","pelvicStability"], muscles:["gluteusMedius","hipFlexors","obliques"], equipment:["bodyweight"], goals:["stability","motorControl"], capacity:"单腿骨盆稳定", note:"单腿站稳后抬起对侧膝，维持骨盆与躯干不偏移。", limb:"unilateral", symmetry:"unloaded", tutorialUrl:"https://www.acefitness.org/resources/everyone/exercise-library/112/single-leg-stand/", tutorialSource:"ACE" },
  { id:"short-lever-copenhagen-plank", zh:"短杠杆哥本哈根支撑", en:"Short-Lever Copenhagen Plank", family:"recovery-adductor", pattern:"Trunk / Core", joints:["trunkAntiLateralFlexion","pelvicStability","shoulderIsometricStability"], muscles:["adductors","obliques","gluteusMedius"], equipment:["flatBench","bodyweight"], goals:["strength","stability"], capacity:"内收肌与侧链稳定", note:"上侧膝支撑于训练凳，抬起骨盆并保持躯干成线；短杠杆作为默认。", limb:"unilateral", symmetry:"unloaded", tutorialUrl:"https://www.nsca.com/globalassets/education/tsac-report/tsac-report-70.pdf", tutorialSource:"NSCA" },
  { id:"goblet-box-squat", zh:"杯式箱式深蹲", en:"Goblet Box Squat", family:"squat-front-loaded", pattern:"Squat", joints:["hipExtension","kneeExtension","trunkAntiFlexion"], muscles:["quadriceps","gluteusMaximus","adductors"], equipment:["dumbbell","squatBox"], goals:["strength","motorControl"], capacity:"可控幅度下肢力量", note:"胸前持哑铃向稳定箱面下蹲，以箱高限定当前可耐受活动范围。", symmetry:"symmetric", tutorialUrl:"https://www.acefitness.org/resources/everyone/exercise-library/11/back-squat/", tutorialSource:"ACE" },
  { id:"easy-walk-or-cycle", zh:"轻松步行或骑行", en:"Easy Walk or Cycle", family:"locomotion-ground", pattern:"Locomotion", joints:["hipExtension","kneeExtension"], muscles:["gluteusMaximus","quadriceps","hamstrings"], equipment:["bodyweight"], goals:["mobility","motorControl"], capacity:"低强度主动恢复", note:"以轻松、可交谈的强度步行或骑行 20–30 分钟；本动作仅作为恢复日记录入口。", limb:"alternating", symmetry:"unloaded", tutorialUrl:"", tutorialSource:"NASM" },
];

const role = (jointFunctionId: JointFunctionId) => ({ jointFunctionId, role: jointFunctionId.includes("Stability") || jointFunctionId.startsWith("trunkAnti") ? "isometric" as const : "dynamic" as const });

export const recoveryExercises: ExerciseV03[] = specs.map(spec => ({
  schemaVersion:"0.3", id:spec.id, nameZh:spec.zh, nameEn:spec.en, aliases:[], exerciseFamilyId:spec.family,
  defaultVariationId:`${spec.id}--default`, primaryMovementPattern:spec.pattern, secondaryMovementPatterns:[],
  primaryJointFunctions:spec.joints.map(role), secondaryJointFunctions:[], compoundType:"复合",
  limbConfiguration:spec.limb ?? "bilateral", movementPlane:spec.id.includes("lateral") || spec.id.includes("abduction") || spec.id.includes("copenhagen") ? "额状面" : "矢状面",
  primaryMuscles:spec.muscles, secondaryMuscles:[], trainingGoals:spec.goals, primaryCapacity:spec.capacity,
  loadability:"低", technicalComplexity:"低", impactLevel:"低", systemicFatiguePotential:"低", relations:[], reviewFlags:[],
  notes:spec.note, contraindicationNotes:"保持在可耐受范围；疼痛增加、出现锐痛或放射性症状时停止。", createdAt, updatedAt:createdAt,
}));

export const recoveryVariations: ExerciseVariationV03[] = specs.map(spec => ({
  schemaVersion:"0.3", id:`${spec.id}--default`, exerciseId:spec.id, nameZh:"恢复强化周默认方式", nameEn:"Recovery Week Default",
  equipment:spec.equipment, loadingSymmetry:spec.symmetry ?? "symmetric", loadPlacement:spec.symmetry === "unloaded" ? "notApplicable" : "unspecified",
  loadTrackingType:spec.symmetry === "unloaded" ? "bodyweight" : "externalLoad", stabilityDemand:spec.limb === "unilateral" ? "高" : "中",
  tutorialUrl:spec.tutorialUrl, tutorialSource:spec.tutorialSource, executionNotes:spec.note, isDefault:true, createdAt, updatedAt:createdAt,
}));
