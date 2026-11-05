import type { MeasurementSnapshot, WorkoutSet } from './domain/training';
import type { LoadTrackingType } from './schema.v03';

export interface PerformanceEvidence {
  runId: string; completedAt: string; sessionName: string;
  variationId: string; preparation: boolean; sets: WorkoutSet[];
}
export interface PerformancePoint {
  runId: string; date: string; sessionName: string; value: number; set: WorkoutSet;
}
export interface PerformanceMetric {
  id: string; label: string; unit: string; kind: 'strength'|'load'|'reps'|'duration'|'breaths';
  sessions: Array<PerformanceEvidence>; points: PerformancePoint[];
  records: Array<{label:string; value:number; set:WorkoutSet}>;
}
const positive = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value > 0;
export function estimateOneRM(load: number | undefined, reps: number | undefined): number | undefined {
  if (!positive(load) || !positive(reps) || !Number.isInteger(reps) || reps > 12) return undefined;
  return reps === 1 ? load : load * (1 + reps / 30);
}
// Legacy rows are interpreted as reps only. Never infer duration/breaths from targets or metadata.
export function evidenceMeasurement(set: WorkoutSet): MeasurementSnapshot {
  return set.measurementSnapshot ?? {version:1,types:['reps'],trackLoad:true};
}
export function aggregatePerformance(evidence: PerformanceEvidence[], loadType: LoadTrackingType): PerformanceMetric[] {
  const groups = new Map<string, {metric:PerformanceMetric; rows: Array<{e:PerformanceEvidence;set:WorkoutSet;value?:number}>}>();
  for (const e of evidence) {
    if (e.preparation || !Number.isFinite(Date.parse(e.completedAt))) continue;
    for (const set of e.sets) {
      if (!set.completed) continue;
      const m = evidenceMeasurement(set);
      for (const type of m.types) {
        const actual = type === 'reps' ? set.actualReps : type === 'duration' ? set.actualDurationSeconds : set.actualBreaths;
        if (!positive(actual) || (type !== 'duration' && !Number.isInteger(actual))) continue;
        let context = '', label = type === 'duration' ? '秒数' : type === 'breaths' ? '呼吸练习' : '次数';
        let kind:PerformanceMetric['kind'] = type === 'duration' ? 'duration' : type === 'breaths' ? 'breaths' : 'reps';
        if(type!=='reps'&&m.trackLoad) {
          if(set.actualLoad===undefined||!Number.isFinite(set.actualLoad)||set.actualLoad<0)continue;
          context=`resistance-${loadType}-${set.actualLoad}`;label+=` · ${set.actualLoad} kg`;
        }
        if (type === 'reps' && m.trackLoad) {
          if (loadType === 'bodyweight') {
            if (set.actualLoad === undefined || set.actualLoad === 0) { context='bodyweight'; label='自重 · 次数'; }
            else if (positive(set.actualLoad)) {context=`weighted-${set.actualLoad}`;label=`自重 + ${set.actualLoad} kg · 次数`;}
            else continue;
          } else if (loadType === 'assistedBodyweight') {
            if (!positive(set.actualLoad)) continue;
            context=`assisted-${set.actualLoad}`;label=`辅助 ${set.actualLoad} kg · 次数`;
          } else if (positive(set.actualLoad)) {context='external';label='Estimated 1RM';kind='strength';}
          else if (set.actualLoad === 0) {context='unloaded';label='无外部负重 · 次数';}
          else continue;
        }
        const id = [type, m.trackLoad ? 'load' : 'no-load', m.side ?? 'both', context].join(':');
        const suffix = m.side === 'eachSide' ? ' / 每侧' : '';
        if (!groups.has(id)) groups.set(id,{metric:{id,label:label+suffix,kind,unit:kind==='strength'?'kg':kind==='duration'?'sec':kind==='breaths'?'sessions':'reps',sessions:[],points:[],records:[]},rows:[]});
        groups.get(id)!.rows.push({e,set,value:kind==='strength'?estimateOneRM(set.actualLoad,set.actualReps):actual});
      }
    }
  }
  return [...groups.values()].map(({metric, rows}) => {
    const sessions = new Map<string, PerformanceEvidence>();
    for (const {e,set} of rows) {
      const session = sessions.get(e.runId) ?? {...e,sets:[]};
      if (!session.sets.some(item=>item.id===set.id)) session.sets.push(set);
      sessions.set(e.runId,session);
    }
    metric.sessions = [...sessions.values()].sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));
    metric.points = metric.sessions.flatMap(e=>{
      const valid = rows.filter(row=>row.e.runId===e.runId && row.value !== undefined).sort((a,b)=>b.value!-a.value!);
      const best=valid[0];
      return best ? [{runId:e.runId,date:e.completedAt,sessionName:e.sessionName,value:metric.kind==='breaths'?1:best.value!,set:best.set}] : [];
    });
    const record = (label:string, value:(set:WorkoutSet)=>number|undefined) => {
      const best = rows.filter(row=>positive(value(row.set))).sort((a,b)=>value(b.set)!-value(a.set)!)[0];
      if(best) metric.records.push({label,value:value(best.set)!,set:best.set});
    };
    if(metric.kind==='strength') {record('Heaviest Load',s=>s.actualLoad);record('Best Set · 按 e1RM',s=>estimateOneRM(s.actualLoad,s.actualReps));record('Best Estimated 1RM',s=>estimateOneRM(s.actualLoad,s.actualReps));}
    if(metric.kind==='reps') record('Best Reps',s=>s.actualReps);
    if(metric.kind==='duration') record('Longest Hold',s=>s.actualDurationSeconds);
    return metric;
  }).sort((a,b)=>Date.parse(b.sessions.at(-1)!.completedAt)-Date.parse(a.sessions.at(-1)!.completedAt));
}
export type PerformanceWindow = '4W'|'8W'|'6M'|'ALL';
// Latest workout instance, including all compatible recorded modes/contexts in that instance.
export function latestPerformanceSession(metrics:PerformanceMetric[]):PerformanceEvidence|undefined {
  const sessions=metrics.flatMap(m=>m.sessions).sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt));
  const last=sessions[0];if(!last)return undefined;
  const sets=new Map<string,WorkoutSet>();
  for(const session of sessions.filter(s=>s.runId===last.runId))for(const set of session.sets)sets.set(set.id,set);
  return {...last,sets:[...sets.values()].sort((a,b)=>a.order-b.order)};
}
export function recordedTrend(metric:PerformanceMetric):PerformanceMetric {
  if(metric.kind!=='strength')return metric;
  return {...metric,kind:'load',label:'训练重量'+(metric.label.includes('每侧')?' / 每侧':''),points:metric.sessions.flatMap(session=>{
    const set=[...session.sets].filter(s=>positive(s.actualLoad)).sort((a,b)=>b.actualLoad!-a.actualLoad!)[0];
    return set?[{runId:session.runId,date:session.completedAt,sessionName:session.sessionName,value:set.actualLoad!,set}]:[];
  })};
}
export function windowStart(window:PerformanceWindow,now:Date):number {
  if(window==='ALL') return -Infinity;
  const date=new Date(now);
  if(window==='6M') date.setUTCMonth(date.getUTCMonth()-6);
  else date.setUTCDate(date.getUTCDate()-(window==='4W'?28:56));
  return date.getTime();
}
export function filterPoints(points:PerformancePoint[],window:PerformanceWindow,now:Date):PerformancePoint[] {
  return points.filter(p=>Date.parse(p.date)>=windowStart(window,now)&&Date.parse(p.date)<=now.getTime());
}
