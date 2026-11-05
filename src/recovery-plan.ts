// Optional example configuration; no user history or automatic enrollment.
import type { TrainingPlanDraft } from "./domain/training";
import type { MovementPattern, TrainingGoal } from "./types";

export const RECOVERY_PLAN_NAME = "Example · Recovery Strength Week";
export const RECOVERY_PLAN_TITLE = "腰臀恢复强化周";
export const RECOVERY_TOLERANCE_GUIDANCE = "0–2/10 且不增加：继续观察；约 3/10：减小幅度、难度或负重；锐痛、症状增加、放射、麻木或无力：停止动作。次日若熟悉疼痛明显反弹，下次降低负重、幅度或动作难度。";

type Item = [label:string, variationId:string, sets:number, reps:number | undefined, rpe:number | undefined, pattern?:MovementPattern, goal?:TrainingGoal, options?:string[]];
const item = ([label, defaultVariationId, sets, targetReps, targetRPE, movementPattern, trainingGoal="strength", explicitOptionIds=[]]:Item, order:number) => ({
  label, defaultVariationId, order, movementPattern, trainingGoal, explicitOptionIds,
  prescription:{ sets, targetReps, targetRPE },
});
const session = (day:number, title:string, intensity:string, emphasis:string[], items:Item[]) => ({
  name:`恢复强化 · DAY ${day}`, purpose:title, order:day-1,
  designNotes:{
    primaryAdaptations:emphasis, secondaryCapacities:["腰盆稳定","动作耐受"],
    rationale:`${intensity}。本课是症状感知下的力量与控制训练，不是医学诊断或治疗。`,
    sequenceLogic:items.map(value=>value[0]), recoveryLoad:day===7 ? "Lower Low" as const : day===1 || day===4 || day===6 ? "Lower High" as const : "Integrated / Moderate" as const,
    toleranceGuidance:RECOVERY_TOLERANCE_GUIDANCE,
  },
  intents:items.map(item),
});

export function recoveryStrengthWeekV05(playbookId?:string):TrainingPlanDraft {
  return {
    name:RECOVERY_PLAN_NAME, playbookId, cycleName:RECOVERY_PLAN_TITLE,
    cycleFocus:"强化臀大肌、臀中肌、内收肌、后链与腰盆稳定，提高单腿控制和腰臀区域的负荷耐受。",
    goalSummary:"一周独立的恢复强化训练；维持有效下肢力量训练，并根据当日与次日反应调节。",
    rationale:"以强 / 中负荷交替组织臀腿、后链、内收肌与腰盆稳定训练。完成 Day 7 后由用户决定继续本计划或切回常规计划。",
    plannedWeeks:1, expectedSessionsPerWeek:7,
    sessions:[
      session(1,"臀腿力量 + 单腿稳定","RPE 5–6",["臀大肌与臀中肌","单腿控制","抗旋转"],[
        ["90/90 脚踩墙呼吸 · 2 × 5 breaths","wall-breathing",2,5,undefined,undefined,"motorControl"],
        ["Bird Dog · 每侧停留 3–5 秒","bird-dog--default",2,5,5,"Trunk / Core","stability"],
        ["弹力带侧向走 · 每侧 10–15 步","lateral-band-walk--default",2,12,5,"Locomotion","stability"],
        ["保加利亚分腿蹲 · 每侧 8–10","bulgarian-split-squat--legacy-default",3,8,6,"Squat","strength",["split-squat--legacy-default","step-up--legacy-default"]],
        ["Step-up · 每侧 8–10","step-up--legacy-default",3,8,6,"Squat","strength",["split-squat--legacy-default"]],
        ["杯式箱式深蹲 · 可耐受幅度","goblet-box-squat--default",3,8,6,"Squat","strength",["goblet-squat--legacy-default"]],
        ["臀推 / 双腿臀桥 · 10–12","barbell-hip-thrust--legacy-default",3,10,6,undefined,"strength",["glute-bridge--legacy-default"]],
        ["短杠杆哥本哈根支撑 · 每侧 15–25 秒","short-lever-copenhagen-plank--default",3,20,5,"Trunk / Core","stability",["side-plank--default"]],
        ["Pallof Press · 每侧 10","pallof-press--legacy-default",3,10,6,"Trunk / Core","stability"],
      ]),
      session(2,"臀中肌 + 单侧骨盆稳定","RPE 5–6",["臀中肌","额状面骨盆控制","单腿稳定"],[
        ["侧卧髋外展 · 每侧 12–15","side-lying-hip-abduction--default",3,12,6,undefined,"strength",["standing-hip-abduction--default"]],
        ["单腿站姿髋外展 · 每侧 10–12","standing-hip-abduction--default",3,10,6,undefined,"strength",["side-lying-hip-abduction--default"]],
        ["弹力带侧向走 · 每侧 10–15 步","lateral-band-walk--default",3,12,6,"Locomotion","stability"],
        ["Step-down · 每侧 8","step-down--legacy-default",3,8,6,"Squat","motorControl",["step-up--legacy-default"]],
        ["单腿站立提膝等长 · 每侧 20–30 秒","single-leg-knee-drive-hold--default",3,25,5,undefined,"stability"],
        ["Side Plank · 每侧 20–30 秒","side-plank--default",3,25,6,"Trunk / Core","stability"],
        ["Pallof Press · 每侧 10","pallof-press--legacy-default",3,10,6,"Trunk / Core","stability"],
      ]),
      session(3,"臀大肌 + 后链 + 腰盆稳定","RPE 5–6；髋铰链与背伸按耐受调整",["臀大肌与腘绳肌","后链负荷耐受","腰盆稳定"],[
        ["自行车 · 5–8 分钟","easy-walk-or-cycle--default",1,undefined,4,"Locomotion","mobility"],
        ["90/90 脚踩墙呼吸 · 2 × 5 breaths","wall-breathing",2,5,undefined,undefined,"motorControl"],
        ["臀推 · 8–12","barbell-hip-thrust--legacy-default",4,8,6,undefined,"strength",["glute-bridge--legacy-default"]],
        ["腿弯举 · 10–12","leg-curl--default",3,10,6,undefined,"strength"],
        ["轻重量髋铰链 · 8–10","bodyweight-hip-hinge",3,8,5,"Hip Hinge","motorControl",["glute-bridge-prep"]],
        ["Bird Dog · 每侧停留约 5 秒","bird-dog--default",3,5,5,"Trunk / Core","stability"],
        ["小幅罗马椅背伸 · 8–10","45-degree-hip-extension--legacy-default",2,8,5,"Hip Hinge","strength",["glute-bridge--legacy-default"]],
        ["Pallof Press · 每侧 10","pallof-press--legacy-default",3,10,6,"Trunk / Core","stability"],
      ]),
      session(4,"臀腿力量 + 单侧进阶","RPE 约 6；仅在 Day 1 当日与次日均耐受时轻量加重",["单侧下肢力量","臀肌与内收肌","骨盆控制"],[
        ["保加利亚分腿蹲 · 每侧 6–8","bulgarian-split-squat--legacy-default",4,6,6,"Squat","strength",["split-squat--legacy-default"]],
        ["Step-down · 每侧 8","step-down--legacy-default",3,8,6,"Squat","motorControl",["step-up--legacy-default"]],
        ["杯式深蹲 · 6–8","goblet-squat--legacy-default",3,6,6,"Squat","strength",["goblet-box-squat--default"]],
        ["臀推 · 8–10","barbell-hip-thrust--legacy-default",3,8,6,undefined,"strength",["glute-bridge--legacy-default"]],
        ["腿弯举 · 10–12","leg-curl--default",3,10,6,undefined,"strength"],
        ["短杠杆哥本哈根支撑 · 每侧 20–30 秒","short-lever-copenhagen-plank--default",3,20,6,"Trunk / Core","stability",["side-plank--default"]],
        ["Pallof Press · 每侧 10","pallof-press--legacy-default",2,10,6,"Trunk / Core","stability"],
      ]),
      session(5,"内收肌 + 侧链 + Core","RPE 约 5",["内收肌与臀中肌","侧链","额状面控制"],[
        ["短杠杆哥本哈根支撑 · 每侧 20–30 秒","short-lever-copenhagen-plank--default",3,20,5,"Trunk / Core","stability",["side-plank--default"]],
        ["浅幅侧向弓步 · 每侧 8","lateral-lunge--legacy-default",3,8,5,"Squat","motorControl",["lateral-lunge-mobility"]],
        ["弹力带侧向走 · 每侧 12 步","lateral-band-walk--default",3,12,5,"Locomotion","stability"],
        ["侧卧髋外展 · 每侧 12","side-lying-hip-abduction--default",3,12,5,undefined,"strength"],
        ["Side Plank · 每侧 20–30 秒","side-plank--default",3,20,5,"Trunk / Core","stability"],
        ["Bird Dog · 每侧 5","bird-dog--default",3,5,5,"Trunk / Core","stability"],
        ["Pallof Press · 每侧 10","pallof-press--legacy-default",3,10,5,"Trunk / Core","stability"],
      ]),
      session(6,"臀腿综合强化","RPE 约 6；真实训练课，不是回归测试",["综合下肢力量","单腿力量","后链与腰盆控制"],[
        ["保加利亚分腿蹲 · 每侧 8","bulgarian-split-squat--legacy-default",3,8,6,"Squat","strength",["split-squat--legacy-default"]],
        ["Step-up · 每侧 8","step-up--legacy-default",3,8,6,"Squat","strength"],
        ["杯式深蹲 · 8","goblet-squat--legacy-default",3,8,6,"Squat","strength",["goblet-box-squat--default"]],
        ["臀推 · 8–10","barbell-hip-thrust--legacy-default",4,8,6,undefined,"strength",["glute-bridge--legacy-default"]],
        ["轻重量髋铰链 · 8","bodyweight-hip-hinge",3,8,5,"Hip Hinge","motorControl",["glute-bridge-prep"]],
        ["短杠杆哥本哈根支撑 · 每侧 20–30 秒","short-lever-copenhagen-plank--default",2,20,6,"Trunk / Core","stability"],
        ["Pallof Press · 每侧 10","pallof-press--legacy-default",2,10,6,"Trunk / Core","stability"],
      ]),
      session(7,"恢复 · 轻松步行或骑行","不安排正式力量训练",["降低疲劳","观察本周动作耐受","自主决定下一步"],[
        ["轻松步行或骑行 · 20–30 分钟","easy-walk-or-cycle--default",1,undefined,4,"Locomotion","mobility"],
      ]),
    ],
  };
}
