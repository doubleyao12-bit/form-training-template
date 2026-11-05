import type { SupabaseClient } from "@supabase/supabase-js";
import type { HistoryQuery, WorkoutRunSummary } from "../../domain/training";
import type { HistoryRepository } from "../repositories";
import { requireUserId } from "./helpers";
import { loadRunAggregate } from "./workout-mapper";
import { mapSet } from './workout-mapper';
import type { PerformanceEvidence } from '../../performance-profile';

type Row = Record<string, unknown>;

export class SupabaseHistoryRepository implements HistoryRepository {
  constructor(private readonly client: SupabaseClient) {}
  async listPerformanceEvidence(variationId: string): Promise<PerformanceEvidence[]> {
    if(!/^[a-zA-Z0-9_-]+$/.test(variationId)) throw new Error('Invalid variation identity.');
    const userId = await requireUserId(this.client);
    const evidence:PerformanceEvidence[]=[];
    // One joined request per 100 matching exercise instances; no per-run/per-set reads.
    for(let offset=0;;offset+=100) {
      const {data,error}=await this.client.from('workout_exercises')
        .select('id,actual_variation_id,selected_variation_id,intent_snapshot,workout_runs!inner(id,status,completed_at,reverted_at,session_snapshot,user_id),workout_sets(*)')
        .eq('user_id',userId).eq('workout_runs.user_id',userId)
        .eq('workout_sets.user_id',userId)
        .eq('workout_runs.status','completed').is('workout_runs.reverted_at',null)
        .or(`actual_variation_id.eq.${variationId},and(actual_variation_id.is.null,selected_variation_id.eq.${variationId})`)
        .order('id').range(offset,offset+99);
      if(error) throw error;
      for(const item of data??[]) {
        const row=item as unknown as {actual_variation_id:string|null;selected_variation_id:string;intent_snapshot:{preparationIntent?:string};workout_runs:{id:string;completed_at:string;session_snapshot:{name:string}};workout_sets:Row[]};
        if((row.actual_variation_id??row.selected_variation_id)!==variationId)continue;
        evidence.push({runId:row.workout_runs.id,completedAt:row.workout_runs.completed_at,sessionName:row.workout_runs.session_snapshot.name,variationId:row.actual_variation_id??row.selected_variation_id,preparation:Boolean(row.intent_snapshot?.preparationIntent),sets:row.workout_sets.map(mapSet).sort((a,b)=>a.order-b.order)});
      }
      if((data?.length??0)<100) return evidence;
    }
  }
  async listProgressionRuns() {
    const userId = await requireUserId(this.client);
    const { data, error } = await this.client.from("workout_runs").select("source_session_template_id,completed_at,reverted_at").eq("user_id", userId).eq("status", "completed").order("completed_at", { ascending: false }).limit(30);
    if (error) throw error;
    return (data ?? []).map(row => ({ sourceSessionTemplateId: row.source_session_template_id ?? undefined, completedAt: row.completed_at ?? undefined, revertedAt: row.reverted_at ?? undefined }));
  }

  async listRuns(query: HistoryQuery = {}) {
    const userId = await requireUserId(this.client);
    let request = this.client.from("workout_runs").select("*, workout_exercises(count)").eq("user_id", userId).eq("status", "completed").order("completed_at", { ascending: false }).limit(query.limit ?? 30);
    if (query.before) request = request.lt("completed_at", query.before);
    const { data, error } = await request;
    if (error) throw error;
    return (data ?? []).map(row => ({
      id: row.id, userId: row.user_id, sourcePlanId: row.source_plan_id ?? undefined, sourceSessionTemplateId: row.source_session_template_id ?? undefined,
      status: row.status, sessionSnapshot: row.session_snapshot, startedAt: row.started_at ?? undefined, completedAt: row.completed_at ?? undefined,
      revertedAt: row.reverted_at ?? undefined, revertReason: row.revert_reason ?? undefined, version: row.version,
      createdAt: row.created_at, updatedAt: row.updated_at, exerciseCount: row.workout_exercises?.[0]?.count ?? 0,
    })) as WorkoutRunSummary[];
  }

  async getRun(id: string) {
    const userId = await requireUserId(this.client);
    const { data, error } = await this.client.from("workout_runs").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? loadRunAggregate(this.client, data as Row) : null;
  }
}
