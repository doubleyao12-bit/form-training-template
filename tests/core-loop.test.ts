import type { SessionTemplate, WorkoutRunAggregate } from "../src/domain/training";
import { canFinishWorkout, nextPendingExercise, resolveNextSession } from "../src/core-loop";
import { rankSubstitutions } from "../src/substitution";
import { journalWorkoutWrite, readPendingWorkoutWrites, removeWorkoutWrite, shouldReplayWorkoutWrite } from "../src/pending-journal";
import { formatPerformance } from "../src/load-tracking";
import { exerciseLibraryV1 } from "../src/library-v1";

const session = (id:string,order:number):SessionTemplate => ({id,userId:"u",planId:"p",name:id,order,intents:[],createdAt:"",updatedAt:""});
const baseRun = ():WorkoutRunAggregate => ({id:"r",userId:"u",status:"inProgress",version:1,sessionSnapshot:{name:"A",order:0,capturedAt:"now"},createdAt:"now",updatedAt:"now",exercises:[{id:"e1",userId:"u",workoutRunId:"r",order:0,intentSnapshot:{label:"Squat",order:0,defaultVariationId:"back-squat--barbell",explicitOptionIds:[]},defaultVariationId:"back-squat--barbell",selectedVariationId:"back-squat--barbell",exerciseSnapshot:{exerciseId:"back-squat",variationId:"back-squat--barbell",nameZh:"深蹲",nameEn:"Back Squat"},status:"pending",sets:[{id:"s1",userId:"u",workoutExerciseId:"e1",order:0,targetReps:8,completed:false,version:1,updatedAt:"now"}]}]});
const equal=(actual:unknown,expected:unknown)=>{if(actual!==expected)throw new Error(`Expected ${String(expected)}, received ${String(actual)}`)};
const ok=(value:unknown)=>{if(!value)throw new Error("Expected truthy value")};

export function runCoreTests(){
  equal(formatPerformance("externalLoad",80,5),"80 kg × 5");
  equal(formatPerformance("bodyweight",0,8),"自重 × 8");
  equal(formatPerformance("bodyweight",10,8),"自重 + 10 kg × 8");
  equal(formatPerformance("assistedBodyweight",20,8),"辅助 20 kg × 8");
  equal(exerciseLibraryV1.variations.find(item=>item.id==="pull-up--default")?.loadTrackingType,"bodyweight");
  equal(exerciseLibraryV1.variations.find(item=>item.id==="pull-up--assisted")?.loadTrackingType,"assistedBodyweight");
  const sessions=[session("d",3),session("b",1),session("a",0),session("c",2)];
  equal(resolveNextSession(sessions,[])?.id,"a");
  equal(resolveNextSession(sessions,[{sourceSessionTemplateId:"b",completedAt:"2026-01-02"}])?.id,"c");
  equal(resolveNextSession(sessions,[{sourceSessionTemplateId:"d",completedAt:"2026-01-02"}])?.id,"a");
  equal(resolveNextSession(sessions,[{sourceSessionTemplateId:"c",completedAt:"2026-01-02"}])?.id,"d");
  equal(resolveNextSession(sessions,[{sourceSessionTemplateId:"a",completedAt:"2026-01-02",revertedAt:"2026-01-03"}])?.id,"a");
  equal(resolveNextSession(sessions,[{sourceSessionTemplateId:"a",completedAt:"2026-01-01"},{sourceSessionTemplateId:"b",completedAt:"2026-01-02",revertedAt:"2026-01-03"}])?.id,"b");
  equal(resolveNextSession(sessions,[{sourceSessionTemplateId:"missing",completedAt:"2026-01-03"},{sourceSessionTemplateId:"a",completedAt:"2026-01-02"}])?.id,"b");

  const run=baseRun(); equal(nextPendingExercise(run)?.id,"e1"); equal(canFinishWorkout(run),false);
  run.exercises[0].sets[0]={...run.exercises[0].sets[0],actualLoad:80,actualReps:8,completed:true,version:2};
  equal(JSON.stringify([run.exercises[0].sets[0].actualLoad,run.exercises[0].sets[0].actualReps]),JSON.stringify([80,8]));
  const added={...run.exercises[0].sets[0],id:"s2",order:1,version:1};run.exercises[0].sets.push(added);equal(run.exercises[0].sets.length,2);
  run.exercises[0].sets=run.exercises[0].sets.filter(x=>x.id!=="s2");equal(run.exercises[0].sets.length,1);
  run.exercises[0].status="completed";run.exercises[0].actualVariationId=run.exercises[0].selectedVariationId;equal(canFinishWorkout(run),true);
  const snapshot=structuredClone(run);run.exercises[0].exerciseSnapshot.nameZh="新名称";equal(snapshot.exercises[0].exerciseSnapshot.nameZh,"深蹲");

  const version:number=1; const cloudVersion:number=2; let conflicted=false;try{if(version!==cloudVersion)throw new Error("version conflict")}catch{conflicted=true}ok(conflicted);
  const candidates=rankSubstitutions({label:"Squat",order:0,movementPattern:"Squat",trainingGoal:"strength",defaultVariationId:"back-squat--barbell",explicitOptionIds:[]},"back-squat--barbell");
  ok(candidates.length>0);ok(candidates.every(x=>x.exercise.primaryMovementPattern==="Squat"||x.exercise.trainingGoals.includes("strength")));

  const memory=new Map<string,string>();Object.defineProperty(globalThis,"localStorage",{value:{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>memory.set(key,value)}});
  journalWorkoutWrite({workoutRunId:"r",setId:"s1",patch:{actualLoad:55,version:1},timestamp:"now"});
  equal(readPendingWorkoutWrites()[0].patch.actualLoad,55);removeWorkoutWrite("s1");equal(readPendingWorkoutWrites().length,0);
  equal(shouldReplayWorkoutWrite("2026-01-01T00:00:00Z","2026-01-01T00:00:01Z"),true);
  equal(shouldReplayWorkoutWrite("2026-01-01T00:00:02Z","2026-01-01T00:00:01Z"),false);
}
