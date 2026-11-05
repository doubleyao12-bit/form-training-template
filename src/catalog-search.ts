import {exerciseLibraryV1} from "./library-v1";
import {equipmentVocabulary} from "./types";
import {userFamilyId,userFamilyLabel} from "./exercise-family";
export function matchesAction(id:string,query:string){
  const v=exerciseLibraryV1.variations.find(v=>v.id===id);const e=exerciseLibraryV1.exercises.find(e=>e.id===v?.exerciseId);
  if(!v||!e)return false;
  return [e.nameZh,e.nameEn,e.id,...e.aliases,v.id,v.nameZh,v.nameEn,userFamilyLabel(userFamilyId(e),e),...v.equipment.flatMap(id=>[id,equipmentVocabulary[id]])].join(" ").toLowerCase().includes(query.trim().toLowerCase());
}
