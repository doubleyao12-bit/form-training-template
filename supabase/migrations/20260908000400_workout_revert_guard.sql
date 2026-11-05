begin;

alter table public.workout_runs
  add column reverted_at timestamptz,
  add column revert_reason text,
  add column version integer not null default 1 check (version > 0),
  add constraint workout_runs_revert_consistency check (
    (reverted_at is null and revert_reason is null)
    or
    (reverted_at is not null and status = 'completed' and revert_reason in ('accidentalCompletion', 'other'))
  );

create index workout_runs_latest_completed_idx
  on public.workout_runs(user_id, completed_at desc, created_at desc)
  where status = 'completed';

create or replace function public.revert_latest_training_hub_workout(
  p_workout_id uuid,
  p_expected_version integer,
  p_reason text default 'accidentalCompletion'
)
returns table (
  id uuid,
  user_id uuid,
  source_plan_id uuid,
  source_session_template_id uuid,
  status text,
  session_snapshot jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  reverted_at timestamptz,
  revert_reason text,
  version integer,
  created_at timestamptz,
  updated_at timestamptz,
  exercise_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  latest public.workout_runs%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if p_reason not in ('accidentalCompletion', 'other') then raise exception 'Unsupported revert reason.' using errcode = '22023'; end if;

  select * into latest
  from public.workout_runs w
  where w.user_id = current_user_id and w.status = 'completed'
  order by w.completed_at desc nulls last, w.created_at desc
  limit 1
  for update;

  if not found then raise exception 'No completed workout is available to revert.' using errcode = 'P0001'; end if;
  if latest.id <> p_workout_id then raise exception 'Only the most recent completed workout can be reverted.' using errcode = 'P0001'; end if;
  if latest.reverted_at is not null then raise exception 'The most recent workout is already reverted.' using errcode = 'P0001'; end if;
  if latest.version <> p_expected_version then raise exception 'Workout changed elsewhere. Reload before reverting.' using errcode = '40001'; end if;

  update public.workout_runs w
  set reverted_at = now(), revert_reason = p_reason, version = w.version + 1
  where w.id = latest.id and w.user_id = current_user_id and w.version = p_expected_version
  returning w.* into latest;

  if not found then raise exception 'Workout changed elsewhere. Reload before reverting.' using errcode = '40001'; end if;

  return query select latest.id, latest.user_id, latest.source_plan_id, latest.source_session_template_id,
    latest.status, latest.session_snapshot, latest.started_at, latest.completed_at, latest.reverted_at,
    latest.revert_reason, latest.version, latest.created_at, latest.updated_at,
    (select count(*) from public.workout_exercises e where e.workout_run_id = latest.id and e.user_id = current_user_id);
end;
$$;

revoke all on function public.revert_latest_training_hub_workout(uuid, integer, text) from public;
grant execute on function public.revert_latest_training_hub_workout(uuid, integer, text) to authenticated;

comment on column public.workout_runs.reverted_at is 'Soft-void marker. The immutable workout snapshot remains in History but is excluded from progression and previous performance.';
comment on function public.revert_latest_training_hub_workout is 'Atomically reverts only the authenticated user most recent completed workout with optimistic version checking.';

commit;
