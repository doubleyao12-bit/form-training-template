import type { TrainingPlanDraft } from "./domain/training";
import { ReplacementSheet } from "./ReplacementSheet";
import type { MeasurementAdjustment } from "./replacement-engine";

type IntentDraft = TrainingPlanDraft["sessions"][number]["intents"][number];
export function PlanExerciseReplacement({intent,selectedIds=[],choose,close}:{
  intent:IntentDraft; selectedIds?:string[];
  choose:(variationId:string,adjustment?:MeasurementAdjustment)=>void; close:()=>void;
}) {
  return <ReplacementSheet intent={{...intent,explicitOptionIds:intent.explicitOptionIds??[]}} currentId={intent.defaultVariationId}
    selectedIds={selectedIds} choose={(id, adjustment)=>{choose(id,adjustment);close();}} close={close} allowMeasurementChange />;
}
