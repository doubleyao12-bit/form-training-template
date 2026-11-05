type Tutorial = {tutorialSource:"NSCA"|"NASM"|"ACE"|"other";provider:string;tutorialUrl:string;match:string};

const other = (provider:string,tutorialUrl:string,match:string):Tutorial => ({tutorialSource:"other",provider,tutorialUrl,match});
const strengthLog = (slug:string,match:string):Tutorial => other("StrengthLog",`https://www.strengthlog.com/${slug}/`,match);

export const knowledgeExpansionExerciseTutorials: Record<string,Tutorial> = {
  "assisted-nordic-curl":other("[P]rehab","https://library.theprehabguys.com/vimeo-video/nordic-hamstring-curl-assisted/","高跪位、脚踝固定、弹力带环绕躯干并在身后高位锚定，以辅助完整北欧下降和返回。"),
  "eccentric-nordic-curl":other("E3 Rehab","https://e3rehab.com/how-to-perform-nordic-hamstring-curls/","对应以离心阶段为重点的北欧腿弯举，不引入网页训练剂量。"),
  "nordic-curl":other("E3 Rehab","https://e3rehab.com/how-to-perform-nordic-hamstring-curls/","脚踝固定、髋膝肩成线，文章示范完整、辅助、缩短幅度及负重北欧腿弯举。"),
  "slider-leg-curl":other("E3 Rehab","https://e3rehab.com/proximal-hamstring-tendinopathy-rehab/","对应双腿滑盘腿弯举，不继承其他单腿或离心进阶的设置。"),
  "stability-ball-leg-curl":other("[P]rehab","https://library.theprehabguys.com/vimeo-video/hamstring-swissball-curl-prehab/","仰卧脚跟置健身球、抬髋并屈膝滚球，说明稳定球与离心控制。"),
  "ab-wheel-rollout":strengthLog("core-exercises","该专题含跪姿健腹轮独立教学，供当前健腹轮身份参考。"),
  "plank-shoulder-tap":other("[P]rehab","https://library.theprehabguys.com/vimeo-video/tall-plank-shoulder-tap/","高位平板交替抬手触对侧肩，强调肩部稳定与躯干不旋转。"),
  "turkish-get-up":strengthLog("turkish-get-up","对应单侧负重的完整土耳其起立，不用于半程起立身份。"),
  "renegade-row":strengthLog("renegade-row","双手支撑负重的高位平板，交替划船并限制躯干与骨盆旋转。"),
  "cossack-squat":strengthLog("cossack-squat","宽站距向单侧下蹲，另一腿伸直，支撑脚保持贴地后返回。"),
  "kettlebell-swing":strengthLog("kettlebell-swing","壶铃从双腿之间回摆，以爆发髋伸驱动至胸高，手臂不主动抬举。"),
  "sled-push":strengthLog("sled-push","双手扶雪橇、身体前倾，以连续有力短步向前推动并保持躯干稳定。"),
  "wall-slide":other("[P]rehab","https://library.theprehabguys.com/vimeo-video/wall-slide/","双前臂持续贴墙并施压，缓慢向上滑动后返回，避免腰背代偿。"),
};

export const knowledgeExpansionVariationTutorials: Record<string,Tutorial> = {
  "nordic-curl--loaded":other("E3 Rehab","https://e3rehab.com/how-to-perform-nordic-hamstring-curls/","该页讨论增加负重的进阶；不据此确认负重器械或持重位置。"),
  "bear-crawl--backward":other("Physitrack","https://uk.physitrack.com/home-exercise-video/bear-crawl-forward-backward","膝离地并保持对侧手脚协调，教程同时覆盖向前和向后熊爬。"),
};

export const knowledgeExpansionReviewedExecutions: Record<string,string> = {
  "assisted-nordic-curl--default":"assisted-nordic-curl|nordicBench,resistanceBand|symmetric|unspecified",
  "eccentric-nordic-curl--default":"eccentric-nordic-curl|nordicBench|unloaded|notApplicable",
  "nordic-curl--default":"nordic-curl|nordicBench|unloaded|notApplicable",
  "nordic-curl--loaded":"nordic-curl|nordicBench,dumbbell|symmetric|central",
  "slider-leg-curl--default":"slider-leg-curl|sliders,bodyweight|unloaded|notApplicable",
  "stability-ball-leg-curl--default":"stability-ball-leg-curl|stabilityBall,bodyweight|unloaded|notApplicable",
  "ab-wheel-rollout--default":"ab-wheel-rollout|abWheel|symmetric|unspecified",
  "plank-shoulder-tap--default":"plank-shoulder-tap|bodyweight|unloaded|notApplicable",
  "turkish-get-up--default":"turkish-get-up|kettlebell|unilateral|ipsilateral",
  "renegade-row--default":"renegade-row|dumbbell|symmetric|unspecified",
  "cossack-squat--default":"cossack-squat|bodyweight|unloaded|notApplicable",
  "kettlebell-swing--default":"kettlebell-swing|kettlebell|symmetric|unspecified",
  "sled-push--default":"sled-push|sled|symmetric|unspecified",
  "wall-slide--default":"wall-slide|bodyweight|unloaded|notApplicable",
  "kettlebell-arm-bar--default":"kettlebell-arm-bar|kettlebell|unilateral|ipsilateral",
  "bear-crawl--backward":"bear-crawl|bodyweight|unloaded|notApplicable",
};
