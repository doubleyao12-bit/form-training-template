import {exerciseLibraryV1} from './library-v1';
import type {WorkoutRunAggregate} from './domain/training';

export function unavailableExercises(currentId:string,selectedIds:string[]){
  void currentId;
  return new Set(exerciseLibraryV1.variations.filter(v=>selectedIds.includes(v.id)).map(v=>v.exerciseId));
}
export function assertReplacementAvailable(run:WorkoutRunAggregate,exerciseId:string,variationId:string){
  const current=run.exercises.find(e=>e.id===exerciseId);
  const variation=exerciseLibraryV1.variations.find(v=>v.id===variationId);
  if(!current||!variation)throw new Error('动作信息缺失。');
  if(current.selectedVariationId===variationId||unavailableExercises(current.selectedVariationId,run.exercises.filter(e=>e.id!==exerciseId).map(e=>e.selectedVariationId)).has(variation.exerciseId))throw new Error('这个动作已经在当前训练中。');
}
export function validateExerciseOrder(run:WorkoutRunAggregate,ids:string[]){
  if(ids.length!==run.exercises.length||new Set(ids).size!==ids.length||ids.some(id=>!run.exercises.some(e=>e.id===id)))throw new Error('顺序必须包含当前训练全部动作，且不能重复。');
}
