// Local-only fixture. Actual ExerciseOrder + card CSS; no cloud repositories or real records.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ExerciseOrder} from '../src/ExerciseOrder';
import '../src/styles.css';
const key='form-local-mobile-reorder-test';
const initial=[
  {id:'hold',name:'短杠杆哥本哈根支撑',prescription:'每侧 30 秒',set:{actualDurationSeconds:20,completed:true,measurementSnapshot:{types:['duration']}}},
  {id:'lunge',name:'浅幅侧向弓步',prescription:'3 × 8',set:{actualReps:8,actualLoad:10,completed:false,measurementSnapshot:{types:['reps']}}},
  {id:'walk',name:'弹力带侧向走',prescription:'每侧 12 步',set:{actualReps:12,completed:true,measurementSnapshot:{types:['reps']}}},
  {id:'breath',name:'90/90 靠墙呼吸',prescription:'5 breaths',set:{actualBreaths:5,completed:false,measurementSnapshot:{types:['breaths']}}},
];
type Row=typeof initial[number];
function Fixture(){
  const [rows,setRows]=useState<Row[]>(()=>JSON.parse(localStorage.getItem(key)??JSON.stringify(location.search.includes('many=1')?[...initial,...Array.from({length:6},(_,i)=>({...initial[i%4],id:`extra-${i}`}))]:initial)));
  const [action,setAction]=useState('');
  const [saves,setSaves]=useState(0);
  const save=(next:Row[])=>{localStorage.setItem(key,JSON.stringify(next));setRows(next);};
  return <div className="v1"><main className="v1-main"><div className="today-page"><h1>Local mobile regression</h1><section className="exercise-preview"><div className="preview-group-title main"><b>正式训练</b></div><ExerciseOrder ids={rows.map(r=>r.id)} onOrder={async ids=>{save(ids.map(id=>rows.find(r=>r.id===id)!));setSaves(n=>n+1);}} renderItem={(id,_index,handle)=>{const row=rows.find(r=>r.id===id)!;return <div className="exercise-preview-row"><span>{handle}</span><span className="exercise-preview-copy"><b>{row.prescription}</b><small>Local fixture · unchanged entered set</small><input aria-label={`记录 ${id}`} type="number" style={{fontSize:16,maxWidth:'100%',minWidth:0,width:'100%'}} value={row.set.actualReps??row.set.actualDurationSeconds??row.set.actualBreaths??''} onChange={e=>save(rows.map(r=>r.id===id?{...r,set:{...r.set,actualReps:Number(e.target.value)}}:r))}/></span><em>{row.name}</em><strong className="exercise-preview-state">{row.set.completed?'已完成':'待训练'}</strong><span className="exercise-preview-actions"><a href="#tutorial" onClick={()=>setAction('tutorial')}>动作教程 ↗</a><button className="today-change-exercise" onClick={()=>setAction('replacement')}>更换动作</button></span></div>;}}/></section><output data-testid="action">{action}</output><output data-testid="save-count">{saves}</output></div></main></div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
