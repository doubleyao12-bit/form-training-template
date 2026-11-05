begin;

alter table public.training_plans drop constraint training_plans_status_check;
alter table public.training_plans add constraint training_plans_status_check
  check (status in ('active', 'archived', 'deleted'));

create or replace function public.form_update_training_plan(
  p_plan_id uuid, p_expected_updated_at timestamptz, p_draft jsonb
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.training_plans%rowtype;
  v_session jsonb;
  v_intent jsonb;
  v_session_id uuid;
  v_intent_id uuid;
  v_session_ids uuid[] := '{}';
  v_intent_ids uuid[];
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_plan from public.training_plans
    where id = p_plan_id and user_id = v_user_id and status <> 'deleted' for update;
  if not found then raise exception 'Plan not found'; end if;
  if v_plan.updated_at is distinct from p_expected_updated_at then raise exception 'Plan changed on another device; reload before editing'; end if;
  if exists(select 1 from public.workout_runs where user_id = v_user_id and source_plan_id = p_plan_id and status in ('prepared','inProgress'))
    then raise exception 'Finish or reset the current workout before editing this Plan'; end if;
  if jsonb_typeof(p_draft->'sessions') <> 'array' or jsonb_array_length(p_draft->'sessions') = 0
    then raise exception 'Plan needs sessions'; end if;
  update public.training_plans set
    name = p_draft->>'name', goal_summary = p_draft->>'goalSummary',
    cycle_name = p_draft->>'cycleName', cycle_focus = p_draft->>'cycleFocus',
    rationale = p_draft->>'rationale', planned_weeks = (p_draft->>'plannedWeeks')::integer,
    expected_sessions_per_week = (p_draft->>'expectedSessionsPerWeek')::integer,
    start_date = (p_draft->>'startDate')::date, end_date = (p_draft->>'endDate')::date
    where id = p_plan_id and user_id = v_user_id;
  for v_session in select value from jsonb_array_elements(p_draft->'sessions') loop
    if jsonb_typeof(v_session->'intents') <> 'array' or jsonb_array_length(v_session->'intents') = 0
      then raise exception 'Each Session needs formal exercises'; end if;
    select id into v_session_id from public.session_templates
      where user_id = v_user_id and plan_id = p_plan_id and order_index = (v_session->>'order')::integer;
    if v_session_id is null then
      insert into public.session_templates(user_id,plan_id,name,purpose,order_index,design_notes)
      values(v_user_id,p_plan_id,v_session->>'name',v_session->>'purpose',(v_session->>'order')::integer,
        coalesce(v_session->'designNotes','{}'::jsonb) || jsonb_build_object('warmupBlock',v_session->'warmupBlock'))
      returning id into v_session_id;
    else
      update public.session_templates set name=v_session->>'name',purpose=v_session->>'purpose',
        design_notes=coalesce(v_session->'designNotes','{}'::jsonb) || jsonb_build_object('warmupBlock',v_session->'warmupBlock')
      where id=v_session_id and user_id=v_user_id;
    end if;
    v_session_ids := array_append(v_session_ids,v_session_id);
    v_intent_ids := '{}';
    for v_intent in select value from jsonb_array_elements(v_session->'intents') loop
      select id into v_intent_id from public.training_intents
        where user_id=v_user_id and session_template_id=v_session_id and order_index=(v_intent->>'order')::integer;
      if v_intent_id is null then
        insert into public.training_intents(user_id,session_template_id,label,order_index,movement_pattern,training_goal,joint_function_id,default_variation_id,prescription)
        values(v_user_id,v_session_id,v_intent->>'label',(v_intent->>'order')::integer,v_intent->>'movementPattern',v_intent->>'trainingGoal',v_intent->>'jointFunctionId',v_intent->>'defaultVariationId',v_intent->'prescription')
        returning id into v_intent_id;
      else
        update public.training_intents set label=v_intent->>'label',movement_pattern=v_intent->>'movementPattern',
          training_goal=v_intent->>'trainingGoal',joint_function_id=v_intent->>'jointFunctionId',
          default_variation_id=v_intent->>'defaultVariationId',prescription=v_intent->'prescription'
        where id=v_intent_id and user_id=v_user_id;
      end if;
      v_intent_ids := array_append(v_intent_ids,v_intent_id);
      delete from public.training_intent_options where user_id=v_user_id and training_intent_id=v_intent_id;
      insert into public.training_intent_options(user_id,training_intent_id,variation_id,order_index)
        select v_user_id,v_intent_id,value,ordinality-1
        from jsonb_array_elements_text(coalesce(v_intent->'explicitOptionIds','[]'::jsonb)) with ordinality;
      v_intent_id := null;
    end loop;
    delete from public.training_intents where user_id=v_user_id and session_template_id=v_session_id and not(id=any(v_intent_ids));
    v_session_id := null;
  end loop;
  delete from public.session_templates where user_id=v_user_id and plan_id=p_plan_id and not(id=any(v_session_ids));
end $$;

create or replace function public.form_delete_training_plan(p_plan_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform 1 from public.training_plans where id=p_plan_id and user_id=v_user_id and status <> 'deleted' for update;
  if not found then raise exception 'Plan not found'; end if;
  if exists(select 1 from public.workout_runs where user_id=v_user_id and source_plan_id=p_plan_id and status in ('prepared','inProgress'))
    then raise exception 'Finish or reset the current workout before deleting this Plan'; end if;
  update public.training_plans set status='deleted' where id=p_plan_id and user_id=v_user_id;
end $$;

revoke all on function public.form_update_training_plan(uuid,timestamptz,jsonb) from public, anon;
revoke all on function public.form_delete_training_plan(uuid) from public, anon;
grant execute on function public.form_update_training_plan(uuid,timestamptz,jsonb) to authenticated;
grant execute on function public.form_delete_training_plan(uuid) to authenticated;

-- A different execution of the same Exercise is allowed in its own slot.
-- Duplicate protection across other workout slots and optimistic locking remain.
create or replace function public.replace_training_hub_exercise(
  p_exercise_id uuid, p_expected_version integer, p_variation_id text,
  p_snapshot jsonb, p_reason text default null, p_note text default null
) returns integer language plpgsql security invoker set search_path = '' as $$
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
  if e.selected_variation_id=p_variation_id or exists(
    select 1 from public.workout_exercises other
    where other.workout_run_id=r.id and other.user_id=auth.uid() and other.id<>e.id
      and (other.selected_variation_id=p_variation_id or other.exercise_snapshot->>'exerciseId'=p_snapshot->>'exerciseId')
  ) then raise exception 'This exercise is already in the workout'; end if;
  update public.workout_exercises set selected_variation_id=p_variation_id,exercise_snapshot=p_snapshot,replacement_reason=p_reason,replacement_note=p_note where id=e.id and user_id=auth.uid();
  update public.workout_runs set version=version+1 where id=r.id and user_id=auth.uid();
  return r.version+1;
end $$;

commit;
