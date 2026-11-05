begin;

create function public.reorder_training_hub_exercises(p_run_id uuid, p_expected_version integer, p_exercise_ids uuid[])
returns integer language plpgsql security invoker set search_path = '' as $$
declare r public.workout_runs; n integer; offset_index integer;
begin
  select * into r from public.workout_runs where id=p_run_id and user_id=auth.uid() for update;
  if not found or r.status not in ('prepared','inProgress') then raise exception 'Active workout unavailable'; end if;
  if r.version<>p_expected_version then raise exception 'Workout changed elsewhere. Reload before reordering.' using errcode='40001'; end if;
  select count(*),coalesce(max(order_index),0)+count(*)+1 into n,offset_index from public.workout_exercises where workout_run_id=r.id and user_id=auth.uid();
  if p_exercise_ids is null or cardinality(p_exercise_ids)<>n or (select count(distinct x) from unnest(p_exercise_ids) x)<>n or exists(select 1 from unnest(p_exercise_ids) x where not exists(select 1 from public.workout_exercises e where e.id=x and e.workout_run_id=r.id and e.user_id=auth.uid())) then raise exception 'Order must contain every workout exercise exactly once'; end if;
  -- Disjoint temporary range avoids the existing immediate unique constraint.
  update public.workout_exercises set order_index=order_index+offset_index where workout_run_id=r.id and user_id=auth.uid();
  update public.workout_exercises e set order_index=s.ordinality-1 from unnest(p_exercise_ids) with ordinality s(id,ordinality) where e.id=s.id and e.workout_run_id=r.id and e.user_id=auth.uid();
  update public.workout_runs set version=version+1 where id=r.id and user_id=auth.uid();
  return r.version+1;
end $$;

create function public.replace_training_hub_exercise(p_exercise_id uuid, p_expected_version integer, p_variation_id text, p_snapshot jsonb, p_reason text default null, p_note text default null)
returns integer language plpgsql security invoker set search_path = '' as $$
declare e public.workout_exercises; r public.workout_runs;
begin
  select * into e from public.workout_exercises where id=p_exercise_id and user_id=auth.uid();
  if not found then raise exception 'Workout exercise unavailable'; end if;
  select * into r from public.workout_runs where id=e.workout_run_id and user_id=auth.uid() for update;
  if not found or r.status not in ('prepared','inProgress') then raise exception 'Active workout unavailable'; end if;
  if r.version<>p_expected_version then raise exception 'Workout changed elsewhere. Reload before replacing.' using errcode='40001'; end if;
  select * into e from public.workout_exercises where id=p_exercise_id and user_id=auth.uid() for update;
  if e.status not in ('pending','inProgress') then raise exception 'Completed exercise cannot be replaced'; end if;
  if (jsonb_typeof(p_snapshot)='object' and p_snapshot->>'variationId'=p_variation_id and length(p_snapshot->>'exerciseId')>0) is not true then raise exception 'Invalid exercise snapshot'; end if;
  if e.selected_variation_id=p_variation_id or e.exercise_snapshot->>'exerciseId'=p_snapshot->>'exerciseId' or exists(select 1 from public.workout_exercises other where other.workout_run_id=r.id and other.user_id=auth.uid() and other.id<>e.id and (other.selected_variation_id=p_variation_id or other.exercise_snapshot->>'exerciseId'=p_snapshot->>'exerciseId')) then raise exception 'This exercise is already in the workout'; end if;
  update public.workout_exercises set selected_variation_id=p_variation_id,exercise_snapshot=p_snapshot,replacement_reason=p_reason,replacement_note=p_note where id=e.id and user_id=auth.uid();
  update public.workout_runs set version=version+1 where id=r.id and user_id=auth.uid();
  return r.version+1;
end $$;

revoke all on function public.reorder_training_hub_exercises(uuid,integer,uuid[]) from public,anon;
revoke all on function public.replace_training_hub_exercise(uuid,integer,text,jsonb,text,text) from public,anon;
grant execute on function public.reorder_training_hub_exercises(uuid,integer,uuid[]) to authenticated;
grant execute on function public.replace_training_hub_exercise(uuid,integer,text,jsonb,text,text) to authenticated;
-- Additive functions only: no row updates outside calls, no policy changes.
commit;
