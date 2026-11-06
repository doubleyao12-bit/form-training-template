import type {ExerciseLibraryV03, ExerciseV03} from './schema.v03';
import {userFamilyId,userFamilyLabel} from './exercise-family';
import {equipmentVocabulary, exerciseFamilies, type EquipmentId} from './types';

/** Deterministic matching only; punctuation/case/width differences are not new aliases. */
export function normalizeExerciseQuery(value:string):string {
  return value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu,' ').trim();
}
const equipmentSearchAliases:Partial<Record<EquipmentId,string[]>>={
  cableMachine:['cable','绳索','拉力器'],resistanceBand:['band','弹力带'],
  bodyweight:['body weight','自重'],flatBench:['bench','训练凳'],flatBenchPress:['bench','卧推凳'],
  stabilityBall:['swiss ball','瑞士球'],landmine:['地雷杆'],
};
export function searchExerciseLibrary(library:ExerciseLibraryV03,query:string):Array<{
  exercise:ExerciseV03; matchingVariationIds:string[];
}> {
  const tokens=normalizeExerciseQuery(query).split(' ').filter(Boolean);
  const matches=(terms:string[])=>{
    const haystack=normalizeExerciseQuery(terms.join(' '));
    return tokens.every(token=>haystack.includes(token));
  };
  const grouped=new Map<string,typeof library.variations>();
  for(const variation of library.variations){
    const group=grouped.get(variation.exerciseId)??[];group.push(variation);grouped.set(variation.exerciseId,group);
  }
  return library.exercises.flatMap(exercise=>{
    const base=[exercise.id,exercise.nameZh,exercise.nameEn,...exercise.aliases,userFamilyLabel(userFamilyId(exercise),exercise),
      exercise.exerciseFamilyId??'',exercise.exerciseFamilyId?exerciseFamilies[exercise.exerciseFamilyId]:''];
    const variations=grouped.get(exercise.id)??[];
    const matchingVariationIds=variations.filter(variation=>matches([...base,variation.id,variation.nameZh,variation.nameEn,...(variation.aliases??[]),
      ...variation.equipment.flatMap(id=>[id,equipmentVocabulary[id],...(equipmentSearchAliases[id]??[])])])).map(v=>v.id);
    return matchingVariationIds.length||matches(base)?[{exercise,matchingVariationIds}]:[];
  });
}
