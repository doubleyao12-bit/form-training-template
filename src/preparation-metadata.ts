import type { WarmupIntent } from "./domain/training";
/** Authored execution tasks; hip extension alone is not hinge preparation. */
export const preparationMetadata: Record<string, WarmupIntent[]> = {
  "wall-breathing":["breathingTrunkPelvisControl"], "dead-bug-breathing":["breathingTrunkPelvisControl"],
  "hip-switch":["hipMobility"], "shin-box":["hipMobility"],
  "adductor-rockback":["adductorMobility"], "lateral-lunge-mobility":["adductorMobility","lateralMovementPreparation"],
  "dynamic-deep-squat":["squatPatternPreparation"], "squat-to-stand":["squatPatternPreparation"],
  "bodyweight-hip-hinge":["hingePatternPreparation"],
  "glute-bridge-prep":[],
  "thoracic-rotation":["thoracicMobility"], "open-book":["thoracicMobility"],
  "scapular-pushup":["scapularControl","upperPushPullPreparation"], "band-row":["upperPushPullPreparation"],
  "band-pull-apart":["scapularControl","upperPushPullPreparation"],
  "worlds-greatest-stretch":["hipMobility","thoracicMobility"],
  "reverse-lunge-rotation":["unilateralControl"], "vertical-jump":["powerElasticPreparation"],
};
