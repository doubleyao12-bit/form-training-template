import {exerciseLibraryV1} from '../src/library-v1';
import {reviewedTutorialFor} from '../src/reviewed-tutorials';
import {getVariationMetadata} from '../src/exercise-display';
import {tutorialReviewBlockers} from '../scripts/tutorial-review-blockers';
const check=(v:unknown,message:string)=>{if(!v)throw new Error(message);};
for(const v of exerciseLibraryV1.variations){
  const proof=reviewedTutorialFor(v);
  if(proof){
    const url=new URL(proof.tutorialUrl);
    check(url.protocol==='https:'&&!/(\/search\b|[?&](q|search_query)=)/i.test(url.href),`Unsafe tutorial URL: ${v.id}`);
    // Presence only: character count cannot validate movement science. Actual content was reviewed separately.
    check(proof.match.trim().length>0&&proof.provider.trim().length>0,`No semantic review record: ${v.id}`);
    check(getVariationMetadata(v.id)?.tutorialUrl===proof.tutorialUrl,`Display resolver mismatch: ${v.id}`);
  }else{
    check(!v.tutorialUrl&&!v.tutorialSource,`Unverified link escaped quarantine: ${v.id}`);
    const state=tutorialReviewBlockers[v.id];
    check(state?.status==='UNREVIEWED',`Unexplained coverage gap: ${v.id}`);
    check(state.executionSignature===[v.exerciseId,v.equipment.join(','),v.loadingSymmetry,v.loadPlacement].join('|'),`Stale public review signature: ${v.id}`);
    check(Object.keys(state).sort().join(',')==='executionSignature,status',`Internal research leaked: ${v.id}`);
  }
}
const pull=exerciseLibraryV1.variations.find(v=>v.id==='pull-up--default')!;
const assisted=exerciseLibraryV1.variations.find(v=>v.id==='pull-up--assisted')!;
check(pull.tutorialUrl!==assisted.tutorialUrl&&assisted.tutorialUrl?.includes('assisted-pull-up'),'Assisted pull-up inherited ordinary pull-up');
check(getVariationMetadata('goblet-box-squat--default')?.tutorialUrl?.includes('goblet-squat-variations'),'Goblet box squat inherited back squat');
check(getVariationMetadata('wall-breathing')?.tutorialUrl?.includes('/802/90_90_breathing_position'),'Feet-on-wall breathing lost specific setup');
check(!reviewedTutorialFor({...pull,id:'pull-up--new-default'}),'Unreviewed ID inherited');
check(!reviewedTutorialFor({...pull,equipment:['assistedPullUpMachine']}),'Changed equipment inherited');
check(!reviewedTutorialFor({...pull,loadingSymmetry:'unilateral'}),'Changed loading symmetry inherited');
check(!reviewedTutorialFor({...pull,loadPlacement:'frontRack'}),'Changed setup inherited');
check(!reviewedTutorialFor({...pull,isDefault:false}),'New non-default execution inherited');
console.log('Tutorial metadata contracts passed: reviewed resolver, execution signature guards, overrides and explicit gaps. This is NOT full coverage or video playback acceptance.');
