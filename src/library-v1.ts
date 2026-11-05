import { exerciseLibraryV03 } from "./data.v4";
import { expandedExercises, expandedVariations } from "./catalog-expansion";
import type { ExerciseVariationV03 } from "./schema.v03";
import { tutorialFor } from "./exercise-metadata";
import { warmupExercises, warmupVariations } from "./warmup-library";
import { recoveryExercises, recoveryVariations } from "./recovery-catalog";
import {allowedModes} from './measurement-modes';
import { reviewedTutorialFor } from './reviewed-tutorials';
import {knowledgeExpansionAdditionalVariations,knowledgeExpansionExercises,knowledgeExpansionVariations} from './knowledge-expansion-v1';
import { v21Variations } from './catalog-v21';
import { v22Exercises, v22Variations, v22SiblingVariations } from './catalog-v22';
import {firstWaveExercises,firstWaveVariations} from './first-wave-v1';

// Diagnostic release-rebuild candidate: preserve every live identity and its metadata.
// The colliding Push Press entry keeps the live definition pending explicit review.
const additionalFirstWaveExercises=firstWaveExercises.filter(e=>!v22Exercises.some(live=>live.id===e.id));
const additionalFirstWaveVariations=firstWaveVariations.filter(v=>!v22Variations.some(live=>live.id===v.id));

const assistedPullUp: ExerciseVariationV03 = {
  schemaVersion: "0.3", id: "pull-up--assisted", exerciseId: "pull-up",
  nameZh: "器械辅助引体向上", nameEn: "Machine-Assisted Pull-Up",
  equipment: ["assistedPullUpMachine"], loadingSymmetry: "symmetric",
  loadPlacement: "central", loadTrackingType: "assistedBodyweight", stabilityDemand: "低",
  ...tutorialFor("pull-up"),
  executionNotes: "辅助重量越大，实际需要克服的自身体重比例越低。",
  isDefault: false, createdAt: "2026-09-09T12:00:00+08:00", updatedAt: "2026-09-09T12:00:00+08:00",
};

export const exerciseLibraryV1={...exerciseLibraryV03,exercises:[...exerciseLibraryV03.exercises,...expandedExercises,...warmupExercises,...recoveryExercises,...knowledgeExpansionExercises,...v22Exercises,...additionalFirstWaveExercises].map(exercise=>exercise.id==="kettlebell-swing"?{...exercise,exerciseFamilyId:"hinge-ballistic" as const}:exercise),variations:[...exerciseLibraryV03.variations,...expandedVariations,assistedPullUp,...warmupVariations,...recoveryVariations,...knowledgeExpansionVariations,...knowledgeExpansionAdditionalVariations,...v21Variations,...v22Variations,...v22SiblingVariations,...additionalFirstWaveVariations].map(item=>{
  const v=item.id==="leg-extension--default"?{...item,equipment:["legExtensionMachine" as const]}:item.id==="goblet-squat--legacy-default"?{...item,equipment:["dumbbell" as const]}:item.id==="pallof-press--legacy-default"?{...item,equipment:["cableMachine" as const]}:item;
  const tutorial=reviewedTutorialFor(v);
  // Preserve legacy seed records, but never expose an unreviewed/mismatched tutorial.
  return {...v,tutorialUrl:tutorial?.tutorialUrl,tutorialSource:tutorial?.tutorialSource,allowedMeasurementModes:allowedModes[v.id]??v.allowedMeasurementModes??['reps'] as import('./measurement-modes').MeasurementMode[]};
})};
