import type {MeasurementSnapshot} from './domain/training';
export type MeasurementMode=MeasurementSnapshot['types'][number];
// Authored technique eligibility, not a conversion rule or exercise-name guess.
export const allowedModes:Record<string,MeasurementMode[]>={
  'wall-breathing':['breaths','duration'],
  'dead-bug-breathing':['breaths','duration'],
  'short-lever-copenhagen-plank--default':['duration','reps'],
  'dead-bug--default':['reps','duration'],
  'front-plank--default':['duration'],
  'side-plank--default':['duration'],
  'single-leg-knee-drive-hold--default':['duration'],
  'easy-walk-or-cycle--default':['duration'],
  'body-saw--default':['reps','duration'],
  'hollow-body-hold--default':['duration'],
  'pallof-hold--default':['duration'],
  'kettlebell-arm-bar--default':['duration'],
  'couch-stretch--default':['duration'],
  'farmers-carry--default':['duration'],
  'suitcase-carry--default':['duration'],
  'front-rack-carry--default':['duration'],
  'front-rack-carry--single-kettlebell':['duration'],
  'overhead-carry--default':['duration'],
  'overhead-carry--waiter':['duration'],
  'bear-hug-carry--default':['duration'],
  'bear-crawl--default':['duration'],
  'bear-crawl--backward':['duration'],
  'bear-crawl--lateral':['duration'],
  'crab-walk--default':['duration'],
  'sled-push--default':['duration'],
  'backward-sled-drag--default':['duration'],
};
export const modeLabels:Record<MeasurementMode,string>={reps:'次数',duration:'秒数',breaths:'呼吸次数'};
export function compatibleMeasurement(a:MeasurementSnapshot|undefined,b:MeasurementSnapshot|undefined){
  const key=(s:MeasurementSnapshot|undefined)=>JSON.stringify({types:[...(s?.types??['reps'])].sort(),trackLoad:s?.trackLoad??true,side:s?.side??null});
  return key(a)===key(b);
}
export function selectMeasurement(mode:MeasurementMode,current:MeasurementSnapshot|undefined):MeasurementSnapshot{
  return {version:1,types:[mode],trackLoad:mode==='reps'?(current?.trackLoad??true):false,...(current?.side?{side:current.side}:{})};
}
