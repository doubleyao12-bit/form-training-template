import type { SessionTemplate, WarmupBlock } from "./domain/training";
import { exerciseLibraryV1 } from "./library-v1";
import { warmupActions, warmupBlocks } from "./warmup";

function validWarmup(block: WarmupBlock | undefined): block is WarmupBlock {
  return Boolean(block && block.exercises.length > 0 && block.exercises.length <= 5 &&
    block.exercises.every((exercise, index) => exercise.order === index && Boolean(warmupActions[exercise.defaultVariationId])));
}

/** Read-only fallback for legacy Plans; the session's actual training tasks decide the profile. */
export function resolveSessionWarmup(session: Pick<SessionTemplate, "warmupBlock" | "intents">): WarmupBlock {
  if (validWarmup(session.warmupBlock)) return session.warmupBlock;
  const scores: Record<"A" | "B" | "C" | "D", number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const intent of session.intents) {
    const variation = exerciseLibraryV1.variations.find(item => item.id === intent.defaultVariationId);
    const exercise = exerciseLibraryV1.exercises.find(item => item.id === variation?.exerciseId);
    const pattern = intent.movementPattern ?? exercise?.primaryMovementPattern;
    const functions = new Set([intent.jointFunctionId, ...(exercise?.primaryJointFunctions.map(item => item.jointFunctionId) ?? [])]);
    const goals = new Set([intent.trainingGoal, ...(exercise?.trainingGoals ?? [])]);
    if (pattern === "Squat") scores.A += 6;
    if (pattern === "Hip Hinge") scores.C += 6;
    if (["Horizontal Push", "Horizontal Pull", "Vertical Push", "Vertical Pull"].includes(pattern ?? "")) scores.B += 4;
    if (["Jump / Landing", "Throw / Ballistic", "Locomotion", "Deceleration / Change of Direction"].includes(pattern ?? "")) scores.D += 4;
    if (pattern === "Carry") scores.D += 2;
    if (functions.has("kneeExtension")) scores.A += 1;
    if (functions.has("hipExtension")) scores.C += 1;
    if (functions.has("scapularRetraction") || functions.has("shoulderFlexion")) scores.B += 1;
    if (functions.has("landingDeceleration") || functions.has("hipAbductionPropulsion")) scores.D += 2;
    if (goals.has("power")) scores.D += 2;
    if (exercise?.limbConfiguration === "unilateral" || exercise?.limbConfiguration === "splitStance") scores.D += 1;
    if (exercise?.movementPlane === "额状面" || exercise?.movementPlane === "多平面") scores.D += 1;
  }
  const profile = (Object.keys(scores) as Array<keyof typeof scores>).sort((a, b) => scores[b] - scores[a])[0];
  return warmupBlocks[profile];
}
