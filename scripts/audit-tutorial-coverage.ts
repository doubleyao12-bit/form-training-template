import {exerciseLibraryV1} from '../src/library-v1';
import {reviewedTutorialFor,reviewedExerciseTutorials,reviewedVariationTutorials} from '../src/reviewed-tutorials';
import {tutorialReviewBlockers} from './tutorial-review-blockers';
import {exerciseLibraryV03} from '../src/data.v4';
import {expandedVariations} from '../src/catalog-expansion';
import {warmupVariations} from '../src/warmup-library';
import {recoveryVariations} from '../src/recovery-catalog';
import {tutorialFor} from '../src/exercise-metadata';

// Original seeds stay intact, so the old metadata gap remains independently inspectable.
const baseline=[...exerciseLibraryV03.variations,...expandedVariations,...warmupVariations,...recoveryVariations,{id:'pull-up--assisted',exerciseId:'pull-up',isDefault:false,...tutorialFor('pull-up')}].map(v=>({...v,...(!v.tutorialUrl&&v.isDefault?tutorialFor(v.exerciseId):{})}));
const baselineClusters: Record<string,Record<string,string[]>>={};
for(const v of baseline.filter(v=>!v.tutorialUrl)){
  const e=exerciseLibraryV1.exercises.find(e=>e.id===v.exerciseId)!;
  const pattern=e.primaryMovementPattern??'Unclassified / auxiliary',family=e.exerciseFamilyId??'No family';
  ((baselineClusters[pattern]??={})[family]??=[]).push(v.id);
}

const rows=exerciseLibraryV1.variations.map(v=>{
  const e=exerciseLibraryV1.exercises.find(e=>e.id===v.exerciseId)!;
  const proof=reviewedTutorialFor(v);
  let invalid=false;
  if(v.tutorialUrl){try{const u=new URL(v.tutorialUrl);invalid=u.protocol!=='https:'||/(\/search\b|[?&](q|search_query)=)/i.test(u.href);}catch{invalid=true;}}
  return {id:v.id,exerciseId:e.id,name:v.isDefault?e.nameZh:v.nameZh,pattern:e.primaryMovementPattern,family:e.exerciseFamilyId,url:v.tutorialUrl??null,provider:proof?.provider??v.tutorialSource??null,resolution:proof?(reviewedVariationTutorials[v.id]?'directOverride':'exerciseInheritance'):null,status:invalid?'invalid':proof&&proof.tutorialUrl===v.tutorialUrl?'reviewed':v.tutorialUrl?'unverified':'missing',match:proof?.match??null,blocker:tutorialReviewBlockers[v.id]??null};
});
const orphaned=Object.keys(reviewedExerciseTutorials).filter(id=>!exerciseLibraryV1.exercises.some(e=>e.id===id)).concat(Object.keys(reviewedVariationTutorials).filter(id=>!exerciseLibraryV1.variations.some(v=>v.id===id)));
if(orphaned.length)throw new Error(`Orphaned tutorial records: ${orphaned.join(', ')}`);
for(const row of rows)if(row.status==='missing'&&!row.blocker)throw new Error(`Missing review notes: ${row.id}`);
for(const id of Object.keys(tutorialReviewBlockers))if(!rows.some(r=>r.id===id&&r.status==='missing'))throw new Error(`Stale blocker: ${id}`);
const providers:Record<string,number>={};
for(const row of rows.filter(r=>r.status==='reviewed'))providers[row.provider!]=(providers[row.provider!]??0)+1;
console.log(JSON.stringify({total:rows.length,reviewed:rows.filter(r=>r.status==='reviewed').length,direct:rows.filter(r=>r.resolution==='directOverride').length,inherited:rows.filter(r=>r.resolution==='exerciseInheritance').length,external:rows.filter(r=>r.status==='reviewed').length,externalNote:'Hosting dimension, overlaps direct/inherited. All tutorials are professional external links; no FORM-hosted videos.',withMetadata:rows.filter(r=>r.url).length,missing:rows.filter(r=>r.status==='missing').length,unverified:rows.filter(r=>r.status==='unverified').length,invalid:rows.filter(r=>r.status==='invalid').length,baseline:{total:baseline.length,withMetadata:baseline.filter(v=>v.tutorialUrl).length,missing:baseline.filter(v=>!v.tutorialUrl).length,clusters:baselineClusters},providers,rows},null,2));
declare const process:{argv:string[]};
if(process.argv.includes('--require-complete')&&rows.some(r=>r.status!=='reviewed'))throw new Error(`Tutorial coverage incomplete: ${rows.filter(r=>r.status!=='reviewed').length}/${rows.length}`);
