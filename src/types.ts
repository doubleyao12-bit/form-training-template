export const movementPatterns = [
  "Squat", "Hip Hinge", "Horizontal Push", "Vertical Push",
  "Horizontal Pull", "Vertical Pull", "Carry", "Trunk / Core",
  "Jump / Landing", "Throw / Ballistic", "Locomotion",
  "Deceleration / Change of Direction",
] as const;
export const goals = ["hypertrophy", "strength", "power", "stability", "mobility", "motorControl"] as const;
export const levels = ["低", "中", "高"] as const;

export const equipmentVocabulary = {
  bodyweight: "徒手", barbell: "杠铃", dumbbell: "哑铃", cableMachine: "拉力器",
  resistanceBand: "弹力带", squatRack: "深蹲架", safetySquatBar: "安全深蹲杠",
  squatBox: "深蹲箱", kettlebell: "壶铃", flatBench: "训练凳",
  stepPlatform: "踏台", trapBar: "六角杠", backExtensionBench: "罗马椅",
  flatBenchPress: "卧推凳", pullUpBar: "单杠", dipBars: "双杠", medicineBall: "药球",
  assistedPullUpMachine: "辅助引体向上机",
  seatedCalfRaiseMachine: "坐姿提踵机", chestSupportedRowMachine: "胸托划船机",
  landmine: "地雷架", farmerHandles: "农夫行走把手", sled: "雪橇", suspensionTrainer: "悬挂训练器",
  nordicBench: "北欧腿弯举凳", sliders: "滑盘", stabilityBall: "健身球", abWheel: "健腹轮",
  smithMachine: "史密斯机", beltSquatMachine: "腰带深蹲机", hackSquatMachine: "哈克深蹲机",
  legPressMachine: "腿举机", legExtensionMachine: "腿屈伸机", legCurlMachine: "腿弯举机",
  chestPressMachine: "胸推机", rowMachine: "划船机", adductorMachine: "髋内收机",
  abductorMachine: "髋外展机", ghd: "GHD 训练架",
} as const;
export const muscleVocabulary = {
  quadriceps: "股四头肌", gluteusMaximus: "臀大肌", gluteusMedius: "臀中肌",
  hamstrings: "腘绳肌", adductors: "内收肌群", erectorSpinae: "竖脊肌",
  latissimusDorsi: "背阔肌", forearmFlexors: "前臂屈肌群", obliques: "腹斜肌",
  transversusAbdominis: "腹横肌", rectusAbdominis: "腹直肌", serratusAnterior: "前锯肌",
  gastrocnemius: "腓肠肌", soleus: "比目鱼肌", lateralTrunkFlexors: "躯干侧屈肌群",
  bicepsBrachii: "肱二头肌", brachialis: "肱肌", brachioradialis: "肱桡肌",
  pectoralisMajor: "胸大肌", anteriorDeltoid: "三角肌前束", medialDeltoid: "三角肌中束",
  posteriorDeltoid: "三角肌后束", tricepsBrachii: "肱三头肌", trapezius: "斜方肌",
  rhomboids: "菱形肌", rotatorCuff: "肩袖肌群", hipFlexors: "髋屈肌群", quadratusLumborum: "腰方肌",
} as const;
export const jointFunctionVocabulary = {
  hipExtension: "髋伸展", kneeExtension: "膝伸展", ankleDorsiflexion: "踝背屈",
  anklePlantarflexion: "踝跖屈", elbowFlexion: "肘屈曲", forearmSupination: "前臂旋后",
  shoulderHorizontalAdduction: "肩水平内收", shoulderIsometricStability: "肩关节等长稳定",
  kneeIsometricStability: "膝关节等长稳定", trunkAntiFlexion: "躯干抗屈曲",
  trunkAntiRotation: "躯干抗旋转", lateralTrunkStability: "躯干侧向稳定",
  pelvicStability: "骨盆稳定", hipAbductionPropulsion: "髋外展推进",
  tripleExtension: "髋膝踝伸展", landingDeceleration: "落地减速",
  shoulderFlexion: "肩屈曲", shoulderExtension: "肩伸展", shoulderAbduction: "肩外展",
  shoulderAdduction: "肩内收", shoulderHorizontalAbduction: "肩水平外展", elbowExtension: "肘伸展",
  scapularProtraction: "肩胛前伸", scapularRetraction: "肩胛后缩", scapularUpwardRotation: "肩胛上回旋",
  trunkAntiExtension: "躯干抗伸展", trunkFlexion: "躯干屈曲", trunkRotation: "躯干旋转",
  trunkAntiLateralFlexion: "躯干抗侧屈", hipFlexion: "髋屈曲",
  kneeFlexion: "膝屈曲", hipAdduction: "髋内收", shoulderExternalRotation: "肩外旋",
  scapularDepression: "肩胛下沉",
} as const;

export type MovementPattern = typeof movementPatterns[number];
export type TrainingGoal = typeof goals[number];
export type Level = typeof levels[number];
export type EquipmentId = keyof typeof equipmentVocabulary;
export type MuscleId = keyof typeof muscleVocabulary;
export type JointFunctionId = keyof typeof jointFunctionVocabulary;
export type LimbConfiguration = "bilateral" | "unilateral" | "splitStance" | "alternating";
export type LoadingSymmetry = "symmetric" | "asymmetric" | "unilateral" | "unloaded";
export const limbConfigurationDefinitions: Record<LimbConfiguration, string> = {
  bilateral: "左右肢体同时以相同角色完成主要动作。",
  unilateral: "主要推进、支撑或承重任务由单侧肢体完成。",
  splitStance: "双脚同时接触地面，但前后位置与功能角色不同。",
  alternating: "左右侧在重复之间交替承担主要动作任务。",
};
export const loadingSymmetryDefinitions: Record<LoadingSymmetry, string> = {
  symmetric: "外部负荷相对身体中线对称分布。",
  asymmetric: "外部阻力来自偏心或单侧方向，但动作可由双侧肢体共同完成。",
  unilateral: "外部负荷直接由单侧肢体独立持有或承受。",
  unloaded: "没有可归类的外部负荷；仅使用自身体重或惯性。",
};

export interface LevelRubric { 低: string; 中: string; 高: string }
export const attributeRubrics = {
  loadability: {
    低: "外部负重并非主要进阶手段；加重会快速改变动作质量或训练目的。",
    中: "可稳定渐进负重，但受器械、姿势或局部组织耐受限制。",
    高: "动作结构支持长期、可量化的大幅负重递增。",
  },
  technicalComplexity: {
    低: "单一主要任务；通常一次示范后即可安全开始练习。",
    中: "需要协调多个关节或保持关键躯干位置；通常需要若干次指导。",
    高: "涉及高速、腾空、落地或复杂时序；需要明确前置能力和持续指导。",
  },
  stabilityDemand: {
    低: "支撑面稳定，外部扰动小，平衡通常不限制输出。",
    中: "需主动控制躯干或关节位置，但轻微偏移不立即导致失败。",
    高: "单侧支撑、窄支撑或明显外部扰动；稳定性直接限制动作完成。",
  },
  impactLevel: {
    低: "无腾空或快速碰撞；地面反作用力变化平缓。",
    中: "存在快速制动或轻度反复冲击，但无最大幅度落地。",
    高: "包含腾空、落地、跳跃或高速变向，产生显著冲击峰值。",
  },
  systemicFatiguePotential: {
    低: "局部负荷为主，参与肌群少，通常不明显影响后续全身训练。",
    中: "动用较多肌群或具有一定速度/密度，可能影响同课后续表现。",
    高: "可使用大负重并动用大量肌群，对心肺、神经和恢复产生明显影响。",
  },
} as const satisfies Record<string, LevelRubric>;

export const exerciseFamilies = {
  "squat-back-loaded": "背部负重深蹲族",
  "squat-front-loaded": "前侧负重深蹲族",
  "squat-split-stance": "分腿蹲族",
  "squat-lunge": "弓步族",
  "squat-step": "踏台族",
  "hinge-deadlift": "硬拉族",
  "hinge-ballistic": "髋部弹震发力族",
  "hinge-romanian-deadlift": "罗马尼亚硬拉族",
  "hinge-hip-thrust-bridge": "臀推与臀桥族",
  "hinge-good-morning": "早安式族",
  "hinge-pull-through": "拉力器拉穿族",
  "hinge-back-extension": "髋主导背伸族",
  "push-bench": "卧推族", "push-pushup": "俯卧撑族", "push-fly": "夹胸族",
  "push-overhead": "过顶推举族", "push-landmine": "地雷架推举族",
  "push-standing-horizontal": "站姿水平推族", "pull-straight-arm": "直臂肩伸族",
  "pull-row": "划船族", "pull-vertical": "垂直拉族",
  "carry-loaded": "负重行走族", "core-plank": "平板支撑族", "core-rotation": "躯干旋转控制族",
  "jump-vertical": "垂直跳族", "jump-horizontal": "水平跳族", "throw-medicine-ball": "药球投掷族",
  "locomotion-ground": "地面移动族", "deceleration-basic": "基础减速族",
  "isolation-arm": "手臂孤立族", "isolation-shoulder": "肩部孤立族", "isolation-lower": "下肢孤立族",
  "squat-machine": "器械膝伸训练族", "posterior-machine-leg-curl": "器械腿弯举族",
  "push-machine": "器械胸推族", "hip-machine": "髋内收与外展器械族",
  "warmup-breathing": "呼吸与躯干控制族", "warmup-mobility": "动态活动度族",
  "warmup-pattern": "动作模式准备族", "warmup-upper": "上肢准备族", "warmup-power": "低量爆发准备族",
  "recovery-hip-control": "髋部控制训练族", "recovery-adductor": "内收肌稳定训练族",
  "posterior-nordic": "北欧腿弯举族", "posterior-leg-curl": "自重腿弯举族",
  "core-rollout": "核心滚动抗伸展族", "core-hollow": "中空支撑族",
  "core-anti-rotation": "核心抗旋转族", "core-integrated": "动态整合核心族",
  "integrated-get-up": "地面起身族", "squat-single-leg": "单腿深蹲族",
  "full-body-integrated": "全身整合族", "shoulder-control": "肩胛与肩关节控制族",
  "mobility-control": "活动度与主动控制族", "locomotion-resisted": "阻力移动族",
} as const;
export type ExerciseFamilyId = keyof typeof exerciseFamilies;

export type ExerciseRelationType = "alternative" | "easierVariation" | "harderVariation" | "sameFamily" | "prerequisite";
export interface ExerciseRelation {
  /** Read as: the target exercise has this relationship relative to the source exercise. */
  type: ExerciseRelationType;
  targetExerciseId: string | null;
  targetName: string;
  status: "resolved" | "unresolved";
  rationale?: string;
}

export interface Exercise {
  id: string; nameZh: string; nameEn: string; aliases: string[];
  exerciseFamilyId: ExerciseFamilyId | null;
  primaryMovementPattern: MovementPattern | null; secondaryMovementPatterns: MovementPattern[];
  primaryJointFunctions: JointFunctionId[]; secondaryJointFunctions: JointFunctionId[];
  compoundType: "复合" | "孤立";
  limbConfiguration: LimbConfiguration; loadingSymmetry: LoadingSymmetry;
  movementPlane: "矢状面" | "额状面" | "水平面" | "多平面";
  equipment: EquipmentId[]; primaryMuscles: MuscleId[]; secondaryMuscles: MuscleId[];
  trainingGoals: TrainingGoal[]; primaryCapacity: string;
  loadability: Level; technicalComplexity: Level; stabilityDemand: Level;
  impactLevel: Level; systemicFatiguePotential: Level;
  relations: ExerciseRelation[];
  notes: string; contraindicationNotes: string; createdAt: string; updatedAt: string;
}
