export interface WarmupProgress {completedIds:string[];selectedVariationIds:Record<string,string>}
export const emptyWarmupProgress=():WarmupProgress=>({completedIds:[],selectedVariationIds:{}});
export function readWarmupProgress(storage:Pick<Storage,'getItem'>,key:string):WarmupProgress{
  if(!key)return emptyWarmupProgress();
  try{const value=JSON.parse(storage.getItem(key)??'null');if(!value||!Array.isArray(value.completedIds)||!value.completedIds.every((id:unknown)=>typeof id==='string')||!value.selectedVariationIds||typeof value.selectedVariationIds!=='object'||Array.isArray(value.selectedVariationIds)||!Object.values(value.selectedVariationIds).every(id=>typeof id==='string'))return emptyWarmupProgress();return value;}catch{return emptyWarmupProgress();}
}
