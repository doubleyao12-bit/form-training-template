import type { WarmupBlock, WarmupIntent } from "./domain/training";

export const warmupIntentLabels: Record<WarmupIntent, string> = {
  breathingTrunkPelvisControl: "呼吸 / 躯干-骨盆控制", hipMobility: "髋部活动度",
  adductorMobility: "内收肌活动度", squatPatternPreparation: "深蹲模式准备",
  hingePatternPreparation: "髋铰链模式准备", thoracicMobility: "胸椎活动度",
  scapularControl: "肩胛控制", upperPushPullPreparation: "上肢推拉准备",
  unilateralControl: "单侧控制", lateralMovementPreparation: "侧向移动准备",
  powerElasticPreparation: "爆发与弹性准备",
};

export type WarmupAction = { nameZh: string; nameEn: string; tutorialUrl: string; tutorialSource: "ACE" | "NASM" | "NSCA" | "other" };
const HIP_9090 = "https://health.clevelandclinic.org/90-90-stretch";
const ACE_UPPER = "https://www.acefitness.org/resources/pros/expert-articles/5412/how-to-increase-upper-body-stability-and-mobility/";
const NSCA_WARMUP = "https://www.nsca.com/education/articles/kinetic-select/introduction-to-dynamic-warm-up/";
const NSCA_POWER = "https://www.nsca.com/contentassets/d09b3f72ad4448398a9fefb36f8daeae/coach-7.3.2-strength-and-conditioning-for-collegiate-trampolinists.pdf";

export const warmupActions: Record<string, WarmupAction> = {
  "wall-breathing": {nameZh:"90/90 靠墙呼吸",nameEn:"90/90 Feet-on-Wall Breathing",tutorialUrl:"https://blog.nasm.org/diaphragmatic-breathing",tutorialSource:"NASM"},
  "dead-bug-breathing": {nameZh:"死虫式呼吸",nameEn:"Dead Bug Breathing",tutorialUrl:"https://www.acefitness.org/resources/everyone/exercise-library/147/supine-dead-bug/",tutorialSource:"ACE"},
  "hip-switch": {nameZh:"90/90 髋部转换",nameEn:"90/90 Hip Switch",tutorialUrl:HIP_9090,tutorialSource:"other"},
  "shin-box": {nameZh:"坐姿髋部转换",nameEn:"Shin Box Switch",tutorialUrl:HIP_9090,tutorialSource:"other"},
  "adductor-rockback": {nameZh:"内收肌后坐",nameEn:"Adductor Rock Back",tutorialUrl:NSCA_WARMUP,tutorialSource:"NSCA"},
  "lateral-lunge-mobility": {nameZh:"侧向弓步活动",nameEn:"Lateral Lunge Mobility",tutorialUrl:"https://www.acefitness.org/resources/everyone/exercise-library/50/side-lunge/",tutorialSource:"ACE"},
  "dynamic-deep-squat": {nameZh:"动态深蹲活动",nameEn:"Dynamic Deep Squat Mobility",tutorialUrl:"",tutorialSource:"ACE"},
  "squat-to-stand": {nameZh:"深蹲起立",nameEn:"Squat to Stand",tutorialUrl:NSCA_WARMUP,tutorialSource:"NSCA"},
  "bodyweight-hip-hinge": {nameZh:"徒手髋铰链",nameEn:"Bodyweight Hip Hinge",tutorialUrl:"https://www.acefitness.org/resources/everyone/exercise-library/6/deadlift/",tutorialSource:"ACE"},
  "glute-bridge-prep": {nameZh:"臀桥准备",nameEn:"Glute Bridge Preparation",tutorialUrl:"https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/",tutorialSource:"ACE"},
  "single-leg-romanian-deadlift--legacy-default": {nameZh:"徒手单腿罗马尼亚硬拉",nameEn:"Bodyweight Single-Leg RDL",tutorialUrl:"https://www.acefitness.org/resources/everyone/exercise-library/329/single-leg-romanian-deadlift/",tutorialSource:"ACE"},
  "thoracic-rotation": {nameZh:"跪姿胸椎旋转",nameEn:"Kneeling Thoracic Rotation",tutorialUrl:ACE_UPPER,tutorialSource:"ACE"},
  "open-book": {nameZh:"侧卧开书",nameEn:"Side-Lying Open Book",tutorialUrl:ACE_UPPER,tutorialSource:"ACE"},
  "scapular-pushup": {nameZh:"肩胛俯卧撑",nameEn:"Scapular Push-Up",tutorialUrl:ACE_UPPER,tutorialSource:"ACE"},
  "band-row": {nameZh:"弹力带划船",nameEn:"Resistance Band Row",tutorialUrl:"https://www.acefitness.org/resources/everyone/exercise-library/48/seated-row/",tutorialSource:"ACE"},
  "band-pull-apart": {nameZh:"弹力带拉开",nameEn:"Band Pull-Apart",tutorialUrl:ACE_UPPER,tutorialSource:"ACE"},
  "worlds-greatest-stretch": {nameZh:"世界最佳拉伸",nameEn:"World's Greatest Stretch",tutorialUrl:NSCA_WARMUP,tutorialSource:"NSCA"},
  "reverse-lunge-rotation": {nameZh:"后撤弓步转体",nameEn:"Reverse Lunge with Rotation",tutorialUrl:"",tutorialSource:"NSCA"},
  "lateral-lunge--legacy-default": {nameZh:"侧向弓步",nameEn:"Lateral Lunge",tutorialUrl:"https://www.acefitness.org/resources/everyone/exercise-library/50/side-lunge/",tutorialSource:"ACE"},
  "vertical-jump": {nameZh:"垂直跳",nameEn:"Vertical Jump",tutorialUrl:NSCA_POWER,tutorialSource:"NSCA"},
  "pogo-jump--default": {nameZh:"踝跳",nameEn:"Pogo Jump",tutorialUrl:NSCA_POWER,tutorialSource:"NSCA"},
  "snap-down--default": {nameZh:"快速下沉定格",nameEn:"Snap Down",tutorialUrl:"https://www.nsca.com/education/podcasts/nsca-coaching-podcast/season-6/season-6-episode-7/",tutorialSource:"NSCA"},
};

const item = (id:string, warmupIntent:WarmupIntent, defaultVariationId:string, replacementVariationIds:string[], order:number, cue:string, reps?:string, breaths?:string) => ({id,warmupIntent,defaultVariationId,replacementVariationIds,order,sets:2,reps,breaths,side: reps?.includes("/侧") ? "eachSide" as const : undefined,cue});
export const warmupBlocks: Record<"A"|"B"|"C"|"D", WarmupBlock> = {
 A:{id:"warmup-a",version:"0.1",title:"深蹲准备",focus:"髋部活动 · 呼吸控制 · 深蹲模式 · 低量爆发",defaultRounds:2,exercises:[
  item("a1","breathingTrunkPelvisControl","wall-breathing",["dead-bug-breathing"],0,"完全呼气，感受腹壁参与；吸气扩张腰腹四周。",undefined,"4–5 次"),
  item("a2","hipMobility","hip-switch",["shin-box","worlds-greatest-stretch"],1,"保持坐骨接触地面，在可控范围内转髋。","6–10 /侧"),
  item("a3","adductorMobility","adductor-rockback",["lateral-lunge-mobility"],2,"脊柱保持长，髋向后坐，不追求疼痛范围。","8–12 /侧"),
  item("a4","squatPatternPreparation","dynamic-deep-squat",["squat-to-stand"],3,"脚掌稳定，膝盖跟随脚尖，逐步进入舒适深度。","6–10"),
  item("a5","powerElasticPreparation","vertical-jump",["pogo-jump--default","snap-down--default"],4,"每次都重新准备；跳得干净，落地安静。","3"),]},
 B:{id:"warmup-b",version:"0.1",title:"上肢准备",focus:"髋部维护 · 胸椎活动 · 肩胛控制 · 推拉准备",defaultRounds:2,exercises:[
  item("b1","hipMobility","hip-switch",["shin-box","worlds-greatest-stretch"],0,"在可控范围内转髋。","6–10 /侧"),
  item("b2","hipMobility","worlds-greatest-stretch",["hip-switch"],1,"后腿延伸，胸椎随呼气旋转。","4–6 /侧"),
  item("b3","thoracicMobility","thoracic-rotation",["open-book"],2,"骨盆稳定，旋转来自胸椎。","6–8 /侧"),
  item("b4","scapularControl","scapular-pushup",["band-pull-apart"],3,"肘保持伸直，只让肩胛贴近与推离胸廓。","8–12"),
  item("b5","upperPushPullPreparation","band-row",["band-pull-apart","scapular-pushup"],4,"阻力轻，肩胛流畅，不做到疲劳。","10–15"),]},
 C:{id:"warmup-c",version:"0.1",title:"髋铰链准备",focus:"髋部活动 · 髋铰链 · 后链与单侧控制",defaultRounds:2,exercises:[
  item("c1","hipMobility","hip-switch",["shin-box","worlds-greatest-stretch"],0,"在可控范围内转髋。","6–10 /侧"),
  item("c2","adductorMobility","adductor-rockback",["lateral-lunge-mobility"],1,"髋向后坐，保持躯干稳定。","8–12 /侧"),
  item("c3","hingePatternPreparation","bodyweight-hip-hinge",["glute-bridge-prep"],2,"髋向后送，胫骨相对稳定，躯干作为整体前倾。","8–12"),
  item("c4","unilateralControl","single-leg-romanian-deadlift--legacy-default",["reverse-lunge-rotation"],3,"用轻负荷或徒手，骨盆保持朝前。","6–8 /侧"),
  item("c5","lateralMovementPreparation","lateral-lunge--legacy-default",["lateral-lunge-mobility"],4,"向侧面坐髋，支撑脚保持完整接触。","6–8 /侧"),]},
 D:{id:"warmup-d",version:"0.1",title:"全身动态准备",focus:"髋部活动 · 多平面移动 · 侧向与弹性准备",defaultRounds:2,exercises:[
  item("d1","hipMobility","hip-switch",["shin-box"],0,"在可控范围内转髋。","6–10 /侧"),
  item("d2","hipMobility","worlds-greatest-stretch",["hip-switch"],1,"延伸髋部，同时完成可控胸椎旋转。","4–6 /侧"),
  item("d3","unilateralControl","reverse-lunge-rotation",["single-leg-romanian-deadlift--legacy-default"],2,"先稳定弓步，再从胸椎完成旋转。","5–6 /侧"),
  item("d4","lateralMovementPreparation","lateral-lunge--legacy-default",["lateral-lunge-mobility"],3,"保持脚掌稳定，平顺换向。","6–8 /侧"),
  item("d5","powerElasticPreparation","pogo-jump--default",["vertical-jump","snap-down--default"],4,"低幅、快速、触地短；质量下降就停止。","8–12"),]},
};

export interface WarmupRunState { round:number; index:number; selectedVariationIds:Record<string,string>; ready:boolean }
export const createWarmupRun = ():WarmupRunState => ({round:1,index:0,selectedVariationIds:{},ready:false});
export function selectWarmupVariation(state:WarmupRunState, exerciseId:string, variationId:string):WarmupRunState { return {...state,selectedVariationIds:{...state.selectedVariationIds,[exerciseId]:variationId}}; }
export function advanceWarmup(state:WarmupRunState, block:WarmupBlock):WarmupRunState { if(state.index < block.exercises.length-1) return {...state,index:state.index+1}; if(state.round < block.defaultRounds) return {...state,round:state.round+1,index:0}; return {...state,ready:true}; }
export const addWarmupRound = (state:WarmupRunState):WarmupRunState => ({...state,round:state.round+1,index:0,ready:false});
