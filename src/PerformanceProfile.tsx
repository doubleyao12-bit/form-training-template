import {useEffect,useMemo,useState} from 'react';
import {getTrainingRepositories} from './data/supabase/repositories';
import {getVariationDisplay,getVariationMetadata} from './exercise-display';
import {aggregatePerformance,evidenceMeasurement,filterPoints,latestPerformanceSession,recordedTrend,type PerformanceEvidence,type PerformanceMetric,type PerformancePoint,type PerformanceWindow} from './performance-profile';
import {formatMeasuredPerformance} from './measurement';
import type {LoadTrackingType} from './schema.v03';
import {formatResistance} from './load-tracking';

export default function PerformanceProfile({variationId,onBack,onSession}:{variationId:string;onBack:()=>void;onSession:(id:string)=>void}) {
  const [evidence,setEvidence]=useState<PerformanceEvidence[]|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;setEvidence(null);setError('');
    Promise.resolve().then(()=>getTrainingRepositories().history.listPerformanceEvidence(variationId)).then(rows=>{if(active)setEvidence(rows);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'无法读取表现记录');});
    return ()=>{active=false;};
  },[variationId,attempt]);
  const display=getVariationDisplay(variationId);
  return evidence ? <PerformanceProfileView key={variationId} evidence={evidence} nameZh={display.nameZh} nameEn={display.nameEn} loadType={getVariationMetadata(variationId)?.loadTrackingType??'externalLoad'} onBack={onBack} onSession={onSession}/> : <section className="performance-page"><button className="performance-back" onClick={onBack}>← 返回</button><h1>{display.nameZh}</h1>{error?<div role="alert"><p>{error}</p><button onClick={()=>setAttempt(x=>x+1)}>重试</button></div>:<p role="status">正在读取这个动作的训练记录…</p>}</section>;
}
const number=(value:number)=>Number.isInteger(value)?String(value):value.toFixed(1);
const date=(value:string)=>new Date(value).toLocaleDateString('zh-CN',{month:'short',day:'numeric'});

export function PerformanceProfileView({evidence,nameZh,nameEn,loadType,onBack,onSession,now=new Date()}:{evidence:PerformanceEvidence[];nameZh:string;nameEn:string;loadType:LoadTrackingType;onBack:()=>void;onSession:(id:string)=>void;now?:Date}) {
  const metrics=useMemo(()=>aggregatePerformance(evidence.filter(e=>Date.parse(e.completedAt)<=now.getTime()),loadType),[evidence,loadType,now.getTime()]);
  const [metricId,setMetricId]=useState('');
  const [window,setWindow]=useState<PerformanceWindow>('8W');
  const metric=metrics.find(m=>m.id===metricId)??metrics[0];
  const trend=metric?recordedTrend(metric):undefined;
  const points=trend?filterPoints(trend.points,window,now):[];
  const last=latestPerformanceSession(metrics);
  const hasReps=last?.sets.some(s=>evidenceMeasurement(s).types.includes('reps'));
  const hasDuration=last?.sets.some(s=>evidenceMeasurement(s).types.includes('duration'));
  const hasBreaths=last?.sets.some(s=>evidenceMeasurement(s).types.includes('breaths'));
  const hasLoad=last?.sets.some(s=>evidenceMeasurement(s).trackLoad&&(loadType!=='externalLoad'||(s.actualLoad??0)>0));
  const format=(set:PerformancePoint['set'])=>loadType==='externalLoad'&&set.actualLoad===0&&(!set.measurementSnapshot||set.measurementSnapshot.types.length===1&&set.measurementSnapshot.types[0]==='reps') ? `${set.actualReps??'—'} reps` : formatMeasuredPerformance(set,loadType);
  return <section className="performance-page">
    <button className="performance-back" onClick={onBack}>← 返回</button>
    <header><h1>{nameZh}</h1><p>{nameEn}</p></header>
    {!metric?<section className="performance-empty"><h2>还没有训练记录</h2><p>完成这个动作后，这里会开始形成你的表现趋势。</p></section>:<>
      {last&&<section className="performance-last"><div className="performance-section-heading"><h2>上次训练</h2><strong>{last.sets.length} 组</strong></div><p><time dateTime={last.completedAt}>{new Date(last.completedAt).toLocaleString('zh-CN',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time><span>{last.sessionName}</span></p>
        <table><thead><tr><th>组</th>{hasLoad&&<th>重量</th>}{hasReps&&<th>次数</th>}{hasDuration&&<th>时长</th>}{hasBreaths&&<th>呼吸</th>}</tr></thead><tbody>{last.sets.map((set,i)=>{const m=evidenceMeasurement(set),side=m.side==='eachSide'?' / 侧':'';return <tr key={set.id}><th scope="row">{i+1}</th>{hasLoad&&<td>{m.trackLoad?formatResistance(loadType,set.actualLoad):'—'}</td>}{hasReps&&<td>{m.types.includes('reps')?`${set.actualReps??'—'}${side}`:'—'}</td>}{hasDuration&&<td>{m.types.includes('duration')?`${set.actualDurationSeconds??'—'} sec${side}`:'—'}</td>}{hasBreaths&&<td>{m.types.includes('breaths')?set.actualBreaths??'—':'—'}</td>}</tr>;})}</tbody></table>
        <button className="performance-history-link" onClick={()=>onSession(last.runId)}>查看本次训练 ↗</button>
      </section>}
      {trend&&<section className="performance-trend"><div className="performance-section-heading"><h2>近期趋势</h2><span>{trend.kind==='load'?'重量 · kg':trend.label}</span></div>
        {metrics.length>1&&<div className="performance-metrics" aria-label="计量与负重语境">{metrics.map(m=><button key={m.id} aria-pressed={m.id===metric.id} onClick={()=>setMetricId(m.id)}>{m.kind==='strength'?'重量'+(m.label.includes('每侧')?' / 每侧':''):m.label}</button>)}</div>}
        <div className="performance-windows" aria-label="时间范围">{(['4W','8W','6M','ALL'] as const).map(w=><button key={w} aria-pressed={window===w} onClick={()=>setWindow(w)}>{w}</button>)}</div>
        <PerformanceChart key={`${metric.id}-${window}`} metric={trend} points={points} format={format}/>
        <p className="performance-note">{trend.kind==='load'?'每次训练的最重已完成组':trend.kind==='duration'?'每次训练的最长已完成时长':trend.kind==='breaths'?'每个点代表一次练习，不代表表现提升':'每次训练的最高完成次数'}</p>
      </section>}
      {metric.records.length>0&&<section className="performance-records"><h2>PR · 个人最佳</h2>{metric.records.map(r=><div key={r.label}><span>{({'Heaviest Load':'最大重量','Best Set · 按 e1RM':'最佳组 · 按估算 1RM','Best Estimated 1RM':'最佳估算 1RM','Best Reps':'最多次数','Longest Hold':'最长保持'} as Record<string,string>)[r.label]??r.label}</span><strong>{r.label==='Best Set · 按 e1RM'?format(r.set):`${number(r.value)} ${metric.kind==='strength'?'kg':metric.unit}`}</strong></div>)}{metric.kind==='strength'&&<details className="performance-method"><summary>统计口径</summary><p className="performance-note">估算 1RM 使用 Epley，仅计算 1–12 次有效组，非真实 1RM。仅统计已完成、未撤销训练；排除已标记准备动作，无法识别未标记热身组。不同计量与负重语境分开比较。</p></details>}</section>}
    </>}
  </section>;
}
export function PerformanceChart({metric,points,format}:{metric:PerformanceMetric;points:PerformancePoint[];format:(set:PerformancePoint['set'])=>string}) {
  const [selected,setSelected]=useState<PerformancePoint|null>(null);
  if(!points.length)return <div className="performance-empty"><p>此时间范围内没有{metric.kind==='strength'?'可估算的有效组':'训练记录'}。</p></div>;
  if(points.length===1)return <div className="performance-current"><small>当前{metric.kind==='breaths'?'练习记录':'表现'} · 仅 1 次训练</small><strong>{metric.kind==='load'?`${number(points[0].value)} kg`:format(points[0].set)}</strong><p>{date(points[0].date)} · {points[0].sessionName}</p><span>更多记录后再展示趋势。</span></div>;
  const width=340,left=55,right=322,top=24,bottom=180;
  const minimum=Math.min(...points.map(p=>p.value));const maximum=Math.max(...points.map(p=>p.value));
  const min=metric.kind==='breaths'?0:Math.max(0,minimum-(maximum-minimum||minimum*.1||1)*.2);
  const max=metric.kind==='breaths'?2:maximum+(maximum-minimum||maximum*.1||1)*.2;
  const first=Date.parse(points[0].date),last=Date.parse(points.at(-1)!.date);
  const position=(p:PerformancePoint,i:number)=>({x:left+(last===first?i/(points.length-1):(Date.parse(p.date)-first)/(last-first))*(right-left),y:bottom-(p.value-min)/(max-min)*(bottom-top)});
  return <><svg className="performance-chart" viewBox={`0 0 ${width} 220`} role="group" aria-label={`${metric.label}，按训练日期，单位 ${metric.unit}`} onClick={event=>{
    const rect=event.currentTarget.getBoundingClientRect();const x=(event.clientX-rect.left)*width/rect.width;const y=(event.clientY-rect.top)*220/rect.height;
    const closest=points.map((point,i)=>({point,distance:Math.hypot(position(point,i).x-x,position(point,i).y-y)})).sort((a,b)=>a.distance-b.distance)[0];
    if(closest.distance<=26)setSelected(closest.point);
  }}>
    <text x="4" y="13">{metric.unit}</text>
    {[min,(min+max)/2,max].map((value,i)=>{const y=bottom-(value-min)/(max-min)*(bottom-top);return <g key={i}><line x1={left} x2={right} y1={y} y2={y}/><text x="4" y={y+4}>{number(value)}</text></g>;})}
    {metric.kind!=='breaths'&&<polyline points={points.map((p,i)=>{const pos=position(p,i);return `${pos.x},${pos.y}`;}).join(' ')}/>}
    {points.map((p,i)=>{const {x,y}=position(p,i);return <g key={p.runId}><circle className="performance-point" cx={x} cy={y} r={selected?.runId===p.runId?6:4}/><circle className="performance-point-target" cx={x} cy={y} r="26" role="button" tabIndex={0} aria-label={`${date(p.date)}，${number(p.value)} ${metric.unit}，${p.sessionName}`} onClick={()=>setSelected(p)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p);}}}/></g>;})}
    <text x={left} y="211">{date(points[0].date)}</text><text x={right} y="211" textAnchor="end">{date(points.at(-1)!.date)}</text>
  </svg><div className="performance-point-detail" aria-live="polite">{selected?<><time>{new Date(selected.date).toLocaleDateString('zh-CN')}</time><strong>{metric.kind==='load'?`${number(selected.value)} kg`:format(selected.set)}</strong><span>{selected.sessionName} · {format(selected.set)}</span></>:<span>轻触数据点查看当天训练</span>}</div></>;
}
