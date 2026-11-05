import {exerciseLibraryV1} from "../src/library-v1";
import {exerciseBodyCategoryIds,exerciseBrowseCategory} from "../src/exercise-taxonomy";
import {newRunPrescription} from "../src/measurement";
import {rankSubstitutions} from "../src/substitution";
import {reviewedTutorialFor} from "../src/reviewed-tutorials";
import {knowledgeExpansionExercises,knowledgeExpansionVariations,knowledgeExpansionAdditionalVariations} from "../src/knowledge-expansion-v1";
import {aggregatePerformance,type PerformanceEvidence} from "../src/performance-profile";
import type {WorkoutSet} from "../src/domain/training";

const check=(value:unknown,message:string)=>{if(!value)throw new Error(message);};
const ids=<T extends {id:string}>(items:T[])=>new Set(items.map(item=>item.id));
check(exerciseLibraryV1.exercises.length>=138,"Original expansion exercises disappeared");
check(exerciseLibraryV1.variations.length>=144,"Original expansion variations disappeared");
check(ids(exerciseLibraryV1.exercises).size===exerciseLibraryV1.exercises.length,"Duplicate exercise identity");
check(ids(exerciseLibraryV1.variations).size===exerciseLibraryV1.variations.length,"Duplicate variation identity");
check(knowledgeExpansionExercises.length===30&&knowledgeExpansionVariations.length===30&&knowledgeExpansionAdditionalVariations.length===5,"Expansion scope drift");

const nordicFamily=exerciseLibraryV1.exercises.filter(item=>item.exerciseFamilyId==="posterior-nordic");
check(nordicFamily.length===3,"Nordic progression family incomplete");
check(exerciseLibraryV1.variations.some(item=>item.id==="nordic-curl--loaded"),"Loaded Nordic variation missing");
const tgu=exerciseLibraryV1.exercises.find(item=>item.id==="turkish-get-up")!;
check(tgu.primaryMovementPattern==="Locomotion"&&exerciseBrowseCategory(tgu)==="rotation-integration","Turkish Get-Up navigation taxonomy incorrect");
check(exerciseBrowseCategory(nordicFamily[0])===null&&exerciseBodyCategoryIds(nordicFamily[0]).includes("hamstrings"),"Nordic must remain pattern-neutral and discoverable by hamstrings");
for(const id of ["farmers-carry","bear-crawl","sled-push"]){
  check(exerciseBrowseCategory(exerciseLibraryV1.exercises.find(item=>item.id===id)!)==="locomotion-carry",id+" map path lost");
}
check(exerciseBrowseCategory(exerciseLibraryV1.exercises.find(item=>item.id==="cossack-squat")!)==="lunge-unilateral","Cossack squat unilateral path lost");
check(exerciseBrowseCategory(exerciseLibraryV1.exercises.find(item=>item.id==="medicine-ball-rotational-throw")!)==="rotation-integration","Rotational throw integration path lost");
for(const [id,body] of [["leg-extension","quadriceps"],["leg-curl","hamstrings"],["standing-calf-raise","calves"]] as const){
  const exercise=exerciseLibraryV1.exercises.find(item=>item.id===id)!;
  check(exerciseBrowseCategory(exercise)===null&&exerciseBodyCategoryIds(exercise).includes(body),id+" joint-function discovery path lost");
}
const exercisesById=new Map(exerciseLibraryV1.exercises.map(item=>[item.id,item]));
for(const variation of exerciseLibraryV1.variations){
  const exercise=exercisesById.get(variation.exerciseId);
  check(exercise,"Variation points to missing exercise: "+variation.id);
  check(exerciseBrowseCategory(exercise!)!==null||exerciseBodyCategoryIds(exercise!).length>0,"Selectable variation has no discovery path: "+variation.id);
}

const expansionVariationIds=new Set([...knowledgeExpansionVariations,...knowledgeExpansionAdditionalVariations].map(item=>item.id));
const expansionVariations=exerciseLibraryV1.variations.filter(item=>expansionVariationIds.has(item.id));
for(const variation of expansionVariations){
  check(variation.allowedMeasurementModes?.length,"Missing allowed measurement mode: "+variation.id);
  check(!variation.allowedMeasurementModes?.includes("distance" as never),"Distance leaked into V1 measurement: "+variation.id);
}
const carry=newRunPrescription("farmers-carry--default",{targetLoad:40,targetReps:20});
check(carry.measurement?.types[0]==="duration"&&carry.measurement.trackLoad&&carry.targetLoad===40&&carry.targetReps===undefined,"Loaded carry duration semantics incorrect");
check(newRunPrescription("hollow-body-hold--default").measurement?.types[0]==="duration","Hollow hold must use duration");
check(newRunPrescription("turkish-get-up--default").measurement?.types[0]==="reps","Turkish Get-Up must use reps");

const intent=(label:string,pattern:typeof tgu.primaryMovementPattern,goal:"strength"|"stability")=>({label,order:0,movementPattern:pattern??undefined,trainingGoal:goal,defaultVariationId:"",explicitOptionIds:[]});
const nordic=rankSubstitutions({...intent("Nordic",null,"strength"),defaultVariationId:"eccentric-nordic-curl--default"},"eccentric-nordic-curl--default",20);
check(nordic.length>0&&nordic.every(item=>item.exercise.exerciseFamilyId==="posterior-nordic"),"Nordic recommendations escaped family");
const getUp=rankSubstitutions({...intent("Get-Up","Locomotion","stability"),defaultVariationId:"turkish-get-up--default"},"turkish-get-up--default",20);
check(getUp.some(item=>item.exercise.id==="half-get-up")&&!getUp.some(item=>item.exercise.id==="sled-push"||item.exercise.id==="bear-crawl"),"Ground-to-standing recommendation polluted by generic locomotion");
const core=rankSubstitutions({...intent("Core","Trunk / Core","stability"),defaultVariationId:"front-plank--default"},"front-plank--default",30);
check(core.some(item=>item.exercise.id==="body-saw")&&!core.some(item=>item.exercise.id==="nordic-curl"||item.exercise.id==="turkish-get-up"),"Core recommendation quality failed");

const reviewed=expansionVariations.filter(item=>reviewedTutorialFor(item));
const expectedReviewedExpansionIds = new Set(["assisted-nordic-curl--default", "eccentric-nordic-curl--default", "nordic-curl--default", "nordic-curl--loaded", "slider-leg-curl--default", "stability-ball-leg-curl--default", "ab-wheel-rollout--default", "plank-shoulder-tap--default", "turkish-get-up--default", "renegade-row--default", "cossack-squat--default", "kettlebell-swing--default", "sled-push--default", "wall-slide--default", "bear-crawl--backward"]);
check(reviewed.length===expectedReviewedExpansionIds.size && reviewed.every(item=>expectedReviewedExpansionIds.has(item.id)),"Admitted expansion tutorial identities changed");
check(expansionVariations.some(item=>item.id==="kettlebell-arm-bar--default"&&!item.tutorialUrl&&!reviewedTutorialFor(item)),"Deferred arm bar disappeared or regained a tutorial");
const set=(id:string,patch:Partial<WorkoutSet>):WorkoutSet=>({id,userId:"fixture",workoutExerciseId:"exercise",order:0,completed:true,version:1,updatedAt:"now",...patch});
const evidence=(variationId:string,sets:WorkoutSet[]):PerformanceEvidence=>({runId:"run-"+variationId,completedAt:"2026-09-20T12:00:00Z",sessionName:"Library Expansion",variationId,preparation:false,sets});
check(aggregatePerformance([evidence("nordic-curl--default",[set("nordic",{actualReps:6,measurementSnapshot:{version:1,types:["reps"],trackLoad:false}})])],"bodyweight")[0].kind==="reps","Nordic performance aggregation failed");
check(aggregatePerformance([evidence("hollow-body-hold--default",[set("hollow",{actualDurationSeconds:30,measurementSnapshot:{version:1,types:["duration"],trackLoad:false}})])],"bodyweight")[0].kind==="duration","Hollow duration performance aggregation failed");
check(aggregatePerformance([evidence("turkish-get-up--default",[set("tgu",{actualLoad:12,actualReps:3,measurementSnapshot:{version:1,types:["reps"],trackLoad:true,side:"eachSide"}})])],"externalLoad")[0].kind==="strength","Turkish Get-Up loaded reps aggregation failed");
console.log(JSON.stringify({originalExpansionExercises:30,originalExpansionVariations:35,currentExercises:exerciseLibraryV1.exercises.length,currentVariations:exerciseLibraryV1.variations.length,reviewedOriginalExpansionTutorials:reviewed.length,distanceMeasurement:false,status:"passed"},null,2));
