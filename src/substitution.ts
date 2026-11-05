import type { TrainingIntentSnapshot } from "./domain/training";
import { replacementCandidates } from "./replacement-engine";

/** Compatibility entrypoint for existing Workout callers and tests. */
export function rankSubstitutions(intent: TrainingIntentSnapshot, currentVariationId: string, limit = 5, selectedVariationIds: string[] = []) {
  return replacementCandidates(intent, currentVariationId, selectedVariationIds).slice(0, limit);
}
