// Synthetic UI only. No account, remote repository or Cloud writes.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ExercisesPage,Today} from '../src/CloudTrainingApp';
import {PlanEditor} from '../src/PlanEditor';
import {ExercisePicker} from '../src/ExercisePicker';
import {newActionIntent,preparedExercises,resolveCycle} from '../src/flexible-training';
import {warmupBlocks} from '../src/warmup';
import type {TrainingPlanAggregate,TrainingPlanDraft,WorkoutRunAggregate} from '../src/domain/training';
import '../src/styles.css';
const draft:TrainingPlanDraft={name:'V2.3 合成训练计划',sessions:[{name:'A · 力量与稳定',order:0,warmupBlock:warmupBlocks.A,intents:['back-squat--legacy-default','romanian-deadlift--legacy-default','pallof-press--legacy-default'].map(newActionIntent)}]};
function aggregate(value:TrainingPlanDraft):TrainingPlanAggregate{return {...value,id:'fixture-plan',userId:'fixture',status:'active',createdAt:'',updatedAt:'revision',sessions:value.sessions.map((s,i)=>({...s,id:s.id??`s-${i}`,userId:'fixture',planId:'fixture-plan',createdAt:'',updatedAt:'',intents:s.intents.map(intent=>({...intent,id:intent.id??crypto.randomUUID(),userId:'fixture',sessionTemplateId:s.id??`s-${i}`,explicitOptionIds:intent.explicitOptionIds??[],createdAt:'',updatedAt:''}))}))};}
function PlanFixture(){const[p,setP]=useState(()=>aggregate(JSON.parse(localStorage.getItem('fixture-v23-plan')??'null')??draft));const[editing,setEditing]=useState(true);return <>{editing?<PlanEditor plan={p} busy={false} cancel={()=>setEditing(false)} save={async value=>{localStorage.setItem('fixture-v23-plan',JSON.stringify(value));setP(aggregate(value));setEditing(false);}}/>:<><p data-testid="saved-count">{p.sessions[0].intents.length}</p><button onClick={()=>setEditing(true)}>编辑</button></>}</>;}
function run(id:string):WorkoutRunAggregate{const p=aggregate(draft),cycle=resolveCycle(p,p.sessions[0].id,null);return {id,userId:'fixture',sourcePlanId:p.id,sourceSessionTemplateId:p.sessions[0].id,status:'prepared',version:1,createdAt:'',updatedAt:'',sessionSnapshot:{name:p.sessions[0].name,order:0,capturedAt:'',warmupBlock:warmupBlocks.A,cycle},exercises:preparedExercises(p,p.sessions[0].id,cycle).map((e,i)=>({id:`e-${i}`,userId:'fixture',workoutRunId:id,sourceIntentId:e.sourceIntentId,order:i,defaultVariationId:e.defaultVariationId,selectedVariationId:e.selectedVariationId,intentSnapshot:e.intentSnapshot,exerciseSnapshot:e.exerciseSnapshot,status:'pending',sets:[]}))};}
function TodayFixture(){const[p]=useState(()=>aggregate(draft));const[r,setR]=useState(()=>run('run-1'));return <><button onClick={()=>setR(run('run-2'))}>下一次同堂训练</button><Today plan={p} next={p.sessions[0]} activeRun={r} state="ready" start={()=>{}} go={()=>{}} onRunChanged={setR}/></>;}
function CarryFixture(){const[open,setOpen]=useState(true),[result,setResult]=useState('');return <><pre data-testid="selection">{result}</pre>{open&&<ExercisePicker allowPlanDefault intent={{label:'负重移动',order:0,defaultVariationId:'farmers-carry--default',movementPattern:'Carry',explicitOptionIds:[]}} currentId="farmers-carry--default" choose={async(id,adjustment,scope)=>setResult(JSON.stringify({id,adjustment,scope}))} close={()=>setOpen(false)}/>}</>;}
const mode=new URLSearchParams(location.search).get('mode');
createRoot(document.getElementById('root')!).render(<div className="v1"><main className="v1-main">{mode==='plan'?<PlanFixture/>:mode==='today'?<TodayFixture/>:mode==='carry'?<CarryFixture/>:<ExercisesPage onSession={()=>{}}/>}</main></div>);
