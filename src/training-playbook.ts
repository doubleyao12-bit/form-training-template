import type { TrainingPlaybookDraft, TrainingPlanDraft } from "./domain/training";
import { warmupBlocks } from "./warmup";

// Optional synthetic example. Persisted only after an explicit user action.
export const examplePlaybookV01: TrainingPlaybookDraft = {
  name: "Example Training Playbook",
  version: "V0.1",
  status: "active",
  positioning: "以基础力量作为 Anchor，以身体能力组织训练，同时确保足够肌肥大刺激，并根据使用者自己的运动项目和目标调整。",
  corePrinciples: [
    "用运动能力的视角组织训练，用力量训练的原则保证刺激。",
    "分化是训练刺激、训练量与恢复的组织工具，不把胸、背、腿、肩当作唯一结构。",
    "每堂训练必须有明确的主训练目标；Secondary 能力围绕主目标服务，避免刺激稀释。",
    "保留深蹲、髋主导、推、拉等可长期量化的 Strength Anchor。",
    "爆发、单腿、负重移动、旋转与多平面能力分布在整个周期，而不是独立成一个“功能日”。",
    "增肌依赖有效训练量、渐进超负荷、饮食与恢复；稳定器械和孤立动作是辅助而非主体。",
    "使用者选择的运动项目可作为训练系统的一部分；健身房补充可系统发展的力量、肌肉、爆发、单侧能力与躯干传力。",
    "训练哲学长期稳定，Plan 约每 4 周根据表现、状态、运动安排与可用频率调整。",
  ],
  organizationRules: [
    "Primary Adaptation 决定每堂训练的主线。",
    "Training Intent 表达要发展的能力，Exercise 只是当前执行选择。",
    "力量 Anchor 保证可量化渐进；辅助刺激补足肌肥大、控制与运动能力。",
    "训练频率决定 Session 组织方式，不改变训练哲学。",
  ],
  frequencyRules: [
    { frequency: 2, approach: "两次 Full Body。" },
    { frequency: 3, approach: "Full Body，并让每堂课承担不同能力重点。" },
    { frequency: 4, approach: "此示例采用 A → B → C → D 的四 Session 顺序循环。" },
    { frequency: 5, approach: "可进一步拆分力量、训练量或 Athletic Stimulus。" },
  ],
  planChangeRules: [
    "4 周是预期周期，不绑定自然月，也不在第 28 天强制结束。",
    "根据训练表现、身体状态、个人运动安排、恢复与实际训练频率决定下一 Plan。",
    "Today 始终依据真实完成 History 推进下一堂 Session，不绑定星期。",
  ],
  effectivenessCriteria: [
    "主目标明确且刺激足够",
    "能够持续渐进",
    "恢复安排合理",
    "覆盖需要发展的身体能力",
    "与真实运动和生活兼容",
    "能够长期执行",
  ],
};

const intent = (label: string, movementPattern: TrainingPlanDraft["sessions"][number]["intents"][number]["movementPattern"], trainingGoal: TrainingPlanDraft["sessions"][number]["intents"][number]["trainingGoal"], exerciseId: string, order: number, sets = 3, reps = 8) => ({
  label,
  order,
  movementPattern,
  trainingGoal,
  defaultVariationId: `${exerciseId}--${["back-squat", "bulgarian-split-squat", "romanian-deadlift", "single-leg-romanian-deadlift", "pallof-press", "lateral-bound", "conventional-deadlift"].includes(exerciseId) ? "legacy-default" : "default"}`,
  prescription: { sets, targetReps: reps, targetRPE: 7, restSeconds: reps <= 5 ? 150 : 90 },
});

export function createExampleTrainingPlan(playbookId?: string): TrainingPlanDraft {
  return {
    name: "Example · Four-Session Strength",
    goalSummary: "在肌肉量与基础力量持续发展的同时，转向以动作模式和身体能力为中心的 Hybrid Strength Training。",
    cycleName: "Plan 01 · 约 4 周",
    cycleFocus: "基础力量 Anchor × 足够增肌刺激 × 可迁移的运动能力",
    playbookId,
    plannedWeeks: 4,
    expectedSessionsPerWeek: 4,
    rationale: "此可选示例演示每周约 4 次的组织方式，实际频率由使用者决定。用 A/B/C 分别建立下肢蹲、上肢推拉与髋主导力量，再用 D 验证全身整合是否带来额外价值；按真实完成顺序循环，不绑定星期。",
    sessions: [
      {
        name: "A · 深蹲主导",
        purpose: "下肢基础力量与垂直力量产生",
        order: 0,
        warmupBlock: warmupBlocks.A,
        designNotes: {
          primaryAdaptations: ["下肢基础力量", "垂直力量产生"],
          secondaryCapacities: ["爆发", "单腿力量 / 控制", "负重移动", "核心稳定"],
          rationale: "建立稳定、可长期渐进的下肢力量 Anchor；它不是传统腿日。",
          sequenceLogic: ["快速产生力量", "大重量产生力量", "单腿产生 / 控制力量", "躯干稳定与负重移动"],
          recoveryLoad: "Lower High",
        },
        intents: [
          intent("垂直爆发", "Jump / Landing", "power", "box-jump", 0, 3, 3),
          intent("深蹲力量 Anchor", "Squat", "strength", "back-squat", 1, 4, 5),
          intent("单腿力量与控制", "Squat", "strength", "bulgarian-split-squat", 2, 3, 8),
          intent("负重移动与躯干稳定", "Carry", "strength", "farmers-carry", 3, 3, 8),
        ],
      },
      {
        name: "B · 上肢主导",
        purpose: "上肢推 / 拉基础力量",
        order: 1,
        warmupBlock: warmupBlocks.B,
        designNotes: {
          primaryAdaptations: ["上肢推力", "上肢拉力"],
          secondaryCapacities: ["单侧上肢能力", "肩胛控制", "躯干抗旋转 / 力量传递"],
          rationale: "在两堂下肢高负荷 Session 之间建立高质量上肢刺激，同时给下肢恢复空间。",
          sequenceLogic: ["水平推 / 拉 Anchor", "垂直推 / 拉", "单侧能力", "抗旋转传力"],
          recoveryLoad: "Lower Low",
        },
        intents: [
          intent("水平推力量 Anchor", "Horizontal Push", "strength", "barbell-bench-press", 0, 4, 6),
          intent("垂直拉力量 Anchor", "Vertical Pull", "strength", "pull-up", 1, 4, 6),
          intent("单侧上肢推力", "Vertical Push", "strength", "half-kneeling-landmine-press", 2, 3, 8),
          intent("单侧上肢拉力", "Horizontal Pull", "hypertrophy", "one-arm-dumbbell-row", 3, 3, 10),
          intent("躯干抗旋转", "Trunk / Core", "stability", "pallof-press", 4, 3, 10),
        ],
      },
      {
        name: "C · 髋主导",
        purpose: "髋伸力量与后链力量",
        order: 2,
        warmupBlock: warmupBlocks.C,
        designNotes: {
          primaryAdaptations: ["髋伸力量", "后链力量"],
          secondaryCapacities: ["单腿髋控制", "水平 / 侧向力量", "躯干稳定"],
          rationale: "用不同于 Squat 的力量产生策略，补充冲刺、跳跃、减速以及真实运动需要的髋伸与后链能力。",
          sequenceLogic: ["水平 / 侧向快速发力", "髋主导力量 Anchor", "单腿髋控制", "躯干稳定"],
          recoveryLoad: "Lower High",
        },
        intents: [
          intent("侧向爆发与落地", "Jump / Landing", "power", "lateral-bound", 0, 3, 4),
          intent("髋主导力量 Anchor", "Hip Hinge", "strength", "conventional-deadlift", 1, 4, 5),
          intent("后链训练量", "Hip Hinge", "hypertrophy", "romanian-deadlift", 2, 3, 8),
          intent("单腿髋控制", "Hip Hinge", "stability", "single-leg-romanian-deadlift", 3, 3, 8),
          intent("核心抗伸展", "Trunk / Core", "stability", "dead-bug", 4, 3, 8),
        ],
      },
      {
        name: "D · 全身整合",
        purpose: "全身力量整合与多平面运动能力",
        order: 3,
        warmupBlock: warmupBlocks.D,
        designNotes: {
          primaryAdaptations: ["全身力量整合", "多平面运动能力"],
          secondaryCapacities: ["旋转", "侧向", "落地控制", "协调", "力量传递"],
          rationale: "在 Direction、Velocity、Coordination 更复杂的环境里整合 A/B/C 建立的基础能力，但不追求极限负重。",
          sequenceLogic: ["胸前传球爆发", "全身力量", "旋转传力", "侧向落地与协调"],
          recoveryLoad: "Integrated / Moderate",
          hypothesis: "示例复盘：如果使用者的其他运动已提供大量侧向、加减速、旋转和协调刺激，真实训练后需判断 D 是否重复投资，或应调整为 Full Body Strength + 少量多平面能力。",
          reviewRequired: true,
        },
        intents: [
          // Optional example only: existing reviewed chest-pass reference; rotation remains in cable chop.
          intent("胸前传球爆发", "Throw / Ballistic", "power", "medicine-ball-chest-pass", 0, 3, 5),
          intent("全身力量", "Hip Hinge", "strength", "conventional-deadlift", 1, 3, 5),
          intent("多平面力量传递", "Trunk / Core", "motorControl", "cable-chop", 2, 3, 8),
          // This is a separately identified bound, not an alias for cut-and-stick.
          intent("侧向跨跳与落地控制", "Jump / Landing", "motorControl", "lateral-bound", 3, 3, 5),
        ],
      },
    ],
  };
}
