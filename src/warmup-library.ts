import type { ExerciseV03, ExerciseVariationV03 } from "./schema.v03";
import type { ExerciseFamilyId, JointFunctionId, MovementPattern, MuscleId } from "./types";
import { warmupActions } from "./warmup";
import { preparationMetadata } from "./preparation-metadata";

const D="2026-09-10T00:00:00+08:00";
type Seed={id:string;family:ExerciseFamilyId;pattern:MovementPattern|null;joints:JointFunctionId[];muscles:MuscleId[];band?:boolean;goals:("mobility"|"motorControl"|"stability"|"power")[];capacity:string;impact?:"中"|"高"};
const seeds:Seed[]=[
 ["wall-breathing","warmup-breathing",null,["trunkAntiExtension","pelvicStability"],["transversusAbdominis","obliques"],["motorControl","stability"],"呼吸与躯干控制"],
 ["dead-bug-breathing","warmup-breathing",null,["trunkAntiExtension","pelvicStability"],["transversusAbdominis","rectusAbdominis"],["motorControl","stability"],"呼吸与躯干控制"],
 ["hip-switch","warmup-mobility",null,["hipFlexion","pelvicStability"],["gluteusMedius","adductors"],["mobility","motorControl"],"髋部活动度"],
 ["shin-box","warmup-mobility",null,["hipFlexion","pelvicStability"],["gluteusMedius","adductors"],["mobility","motorControl"],"髋部活动度"],
 ["adductor-rockback","warmup-mobility",null,["hipFlexion","pelvicStability"],["adductors","gluteusMaximus"],["mobility","motorControl"],"内收肌活动度"],
 ["lateral-lunge-mobility","warmup-mobility",null,["hipFlexion","kneeExtension"],["adductors","gluteusMaximus"],["mobility","motorControl"],"侧向髋部活动度"],
 ["dynamic-deep-squat","warmup-pattern","Squat",["hipFlexion","kneeExtension","ankleDorsiflexion"],["quadriceps","gluteusMaximus"],["mobility","motorControl"],"深蹲模式准备"],
 ["squat-to-stand","warmup-pattern","Squat",["hipExtension","kneeExtension"],["quadriceps","gluteusMaximus"],["mobility","motorControl"],"深蹲模式准备"],
 ["bodyweight-hip-hinge","warmup-pattern","Hip Hinge",["hipExtension","trunkAntiFlexion"],["gluteusMaximus","hamstrings"],["motorControl"],"髋铰链模式准备"],
 ["glute-bridge-prep","warmup-pattern",null,["hipExtension","pelvicStability"],["gluteusMaximus","hamstrings"],["motorControl"],"臀部激活与髋伸准备"],
 ["thoracic-rotation","warmup-mobility",null,["trunkRotation","pelvicStability"],["obliques","erectorSpinae"],["mobility","motorControl"],"胸椎活动度"],
 ["open-book","warmup-mobility",null,["trunkRotation"],["obliques","erectorSpinae"],["mobility"],"胸椎活动度"],
 ["scapular-pushup","warmup-upper",null,["scapularProtraction","trunkAntiExtension"],["serratusAnterior","transversusAbdominis"],["motorControl","stability"],"肩胛控制"],
 ["band-row","warmup-upper","Horizontal Pull",["shoulderExtension","scapularRetraction"],["rhomboids","trapezius"],["motorControl"],"上肢拉力准备",true],
 ["band-pull-apart","warmup-upper",null,["shoulderHorizontalAbduction","scapularRetraction"],["posteriorDeltoid","rhomboids"],["motorControl"],"肩胛与上背准备",true],
 ["worlds-greatest-stretch","warmup-mobility",null,["hipFlexion","trunkRotation"],["hipFlexors","adductors","obliques"],["mobility","motorControl"],"全身动态活动度"],
 ["reverse-lunge-rotation","warmup-pattern","Squat",["kneeExtension","trunkRotation","pelvicStability"],["quadriceps","gluteusMaximus","obliques"],["motorControl","mobility"],"单侧与旋转控制"],
 ["vertical-jump","warmup-power","Jump / Landing",["tripleExtension","landingDeceleration"],["gluteusMaximus","quadriceps","gastrocnemius"],["power","motorControl"],"垂直爆发准备",false,"高"],
].map(x=>{const [id,family,pattern,joints,muscles,goals,capacity,band=false,impact]=x as [string,ExerciseFamilyId,MovementPattern|null,JointFunctionId[],MuscleId[],Seed["goals"],string,boolean,Seed["impact"]];return {id,family,pattern,joints,muscles,goals,capacity,band,impact};});
const role=(jointFunctionId:JointFunctionId)=>({jointFunctionId,role:"dynamic" as const});
export const warmupExercises:ExerciseV03[]=seeds.map(s=>{const a=warmupActions[s.id];return {schemaVersion:"0.3",id:s.id,nameZh:a.nameZh,nameEn:a.nameEn,aliases:[],exerciseFamilyId:s.family,defaultVariationId:s.id,primaryMovementPattern:s.pattern,secondaryMovementPatterns:[],primaryJointFunctions:s.joints.map(role),secondaryJointFunctions:[],compoundType:"复合",limbConfiguration:"bilateral",movementPlane:s.id.includes("lateral")?"额状面":s.id.includes("rotation")||s.id==="open-book"||s.id==="hip-switch"||s.id==="shin-box"?"多平面":"矢状面",primaryMuscles:s.muscles,secondaryMuscles:[],trainingGoals:s.goals,primaryCapacity:s.capacity,loadability:"低",technicalComplexity:s.impact==="高"?"中":"低",impactLevel:s.impact??"低",systemicFatiguePotential:"低",relations:[],reviewFlags:[],notes:"用于 Session-specific warm-up；保持动作质量，不做到疲劳。",contraindicationNotes:"在无痛范围内完成；如出现疼痛或不适，停止并选择同意图替代动作。",createdAt:D,updatedAt:D};});
export const warmupVariations:ExerciseVariationV03[]=seeds.map(s=>{const a=warmupActions[s.id];return {preparationIntents:preparationMetadata[s.id]??[],schemaVersion:"0.3",id:s.id,exerciseId:s.id,nameZh:a.nameZh,nameEn:a.nameEn,equipment:[s.band?"resistanceBand":"bodyweight"],loadingSymmetry:s.band?"symmetric":"unloaded",loadPlacement:"notApplicable",loadTrackingType:"bodyweight",stabilityDemand:"低",tutorialUrl:a.tutorialUrl,tutorialSource:a.tutorialSource,executionNotes:"按热身处方完成，不记录为正式训练组。",isDefault:true,createdAt:D,updatedAt:D};});
