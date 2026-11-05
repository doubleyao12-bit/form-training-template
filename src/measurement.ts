import type { MeasurementSnapshot, TrainingPrescription, WorkoutSet } from "./domain/training";
import type { LoadTrackingType } from "./schema.v03";
import { formatPerformance } from "./load-tracking";
import {firstWavePrescriptions} from './first-wave-v1';
import {v22Variations} from './catalog-v22';

export const repsMeasurement: MeasurementSnapshot = { version: 1, types: ["reps"], trackLoad: true };

// Authored prescription corrections for new runs only, not a history backfill.
const prescriptions: Record<string, TrainingPrescription> = {
  "wall-breathing": { measurement: { version: 1, types: ["breaths"], trackLoad: false }, targetBreaths: 5 },
  "dead-bug-breathing": { measurement: { version: 1, types: ["breaths"], trackLoad: false }, targetBreaths: 5 },
  "short-lever-copenhagen-plank--default": { measurement: { version: 1, types: ["duration"], trackLoad: false, side: "eachSide" }, targetDurationSeconds: 20 },
  "single-leg-knee-drive-hold--default": { measurement: { version: 1, types: ["duration"], trackLoad: false, side: "eachSide" }, targetDurationSeconds: 25 },
  "side-plank--default": { measurement: { version: 1, types: ["duration"], trackLoad: false, side: "eachSide" }, targetDurationSeconds: 25 },
  // New freely selected holds have no invented target; existing snapshots remain untouched.
  "front-plank--default": { measurement: { version: 1, types: ["duration"], trackLoad: false } },
  "easy-walk-or-cycle--default": { measurement: { version: 1, types: ["duration"], trackLoad: false } },
  "hollow-body-hold--default": { measurement: { version: 1, types: ["duration"], trackLoad: false } },
  "pallof-hold--default": { measurement: { version: 1, types: ["duration"], trackLoad: true, side: "eachSide" } },
  "kettlebell-arm-bar--default": { measurement: { version: 1, types: ["duration"], trackLoad: true, side: "eachSide" } },
  "couch-stretch--default": { measurement: { version: 1, types: ["duration"], trackLoad: false, side: "eachSide" } },
  "farmers-carry--default": { measurement: { version: 1, types: ["duration"], trackLoad: true } },
  "suitcase-carry--default": { measurement: { version: 1, types: ["duration"], trackLoad: true, side: "eachSide" } },
  "front-rack-carry--default": { measurement: { version: 1, types: ["duration"], trackLoad: true } },
  "front-rack-carry--single-kettlebell": { measurement: { version: 1, types: ["duration"], trackLoad: true, side: "eachSide" } },
  "overhead-carry--default": { measurement: { version: 1, types: ["duration"], trackLoad: true } },
  "overhead-carry--waiter": { measurement: { version: 1, types: ["duration"], trackLoad: true, side: "eachSide" } },
  "bear-hug-carry--default": { measurement: { version: 1, types: ["duration"], trackLoad: true } },
  "bear-crawl--default": { measurement: { version: 1, types: ["duration"], trackLoad: false } },
  "bear-crawl--backward": { measurement: { version: 1, types: ["duration"], trackLoad: false } },
  "bear-crawl--lateral": { measurement: { version: 1, types: ["duration"], trackLoad: false } },
  "crab-walk--default": { measurement: { version: 1, types: ["duration"], trackLoad: false } },
  "sled-push--default": { measurement: { version: 1, types: ["duration"], trackLoad: true } },
  "backward-sled-drag--default": { measurement: { version: 1, types: ["duration"], trackLoad: true } },
};

export function newRunPrescription(variationId: string, source: TrainingPrescription = {}): TrainingPrescription {
  if (source.measurement) return source;
  // Preserve the live colliding Push Press prescription; only new identities use this data.
  const firstWave=v22Variations.some(v=>v.id===variationId)?undefined:firstWavePrescriptions[variationId];
  if(firstWave){
    const measurement=firstWave.measurement!;
    return {...source,measurement,targetLoad:measurement.trackLoad?source.targetLoad:undefined,
      targetReps:measurement.types.includes('reps')?source.targetReps:undefined,
      targetDurationSeconds:measurement.types.includes('duration')?source.targetDurationSeconds:undefined,
      targetBreaths:measurement.types.includes('breaths')?source.targetBreaths:undefined};
  }
  const corrected = prescriptions[variationId];
  return corrected ? { ...source, targetLoad: corrected.measurement?.trackLoad ? source.targetLoad : undefined, targetReps: undefined, ...corrected,
    targetDurationSeconds: corrected.targetDurationSeconds === undefined ? undefined : source.targetReps ?? corrected.targetDurationSeconds,
    targetBreaths: corrected.targetBreaths === undefined ? undefined : source.targetReps ?? corrected.targetBreaths,
  } : { ...source, measurement: repsMeasurement };
}

export function formatMeasuredPerformance(set: Pick<WorkoutSet, "actualLoad" | "actualReps" | "actualDurationSeconds" | "actualBreaths" | "measurementSnapshot">, loadType: LoadTrackingType): string {
  const measurement = set.measurementSnapshot;
  if (!measurement) return formatPerformance(loadType, set.actualLoad, set.actualReps);
  const values = measurement.types.map(type => type === "reps"
    ? measurement.trackLoad ? formatPerformance(loadType, set.actualLoad, set.actualReps) : `${set.actualReps ?? "—"} reps`
    : type === "duration" ? `${set.actualDurationSeconds ?? "—"} sec` : `${set.actualBreaths ?? "—"} breaths`);
  return values.join(" · ") + (measurement.side === "eachSide" ? " / side" : "");
}
