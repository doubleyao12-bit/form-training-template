-- REVIEW ONLY. Requires 01_complete_execution_catalog.sql. Preserve V2.3 lifecycle/retirement logic.
begin;
create or replace function public.form_assert_execution_v1(p_id text,p_snapshot jsonb,p_prescription jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare v public.form_variation_execution_catalog; m jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v from public.form_variation_execution_catalog where variation_id=p_id;
 if not found then raise exception 'Unknown variation identity'; end if;
 if (jsonb_typeof(p_snapshot)='object' and p_snapshot->>'variationId'=v.variation_id and p_snapshot->>'exerciseId'=v.exercise_id) is not true then raise exception 'Invalid Exercise / Variation pair'; end if;
 if p_snapshot ? 'loadTrackingType' and p_snapshot->>'loadTrackingType' is distinct from v.load_tracking_type then raise exception 'Invalid load tracking semantics'; end if;
 if jsonb_typeof(p_prescription) is distinct from 'object' then raise exception 'Invalid prescription'; end if;
 m:=coalesce(p_prescription->'measurement','{"version":1,"types":["reps"],"trackLoad":true}'::jsonb);
 if jsonb_typeof(m) is distinct from 'object' or jsonb_typeof(m->'types') is distinct from 'array' then raise exception 'Invalid measurement'; end if;
 if jsonb_array_length(m->'types')<>1 or exists(select 1 from jsonb_array_elements_text(m->'types') t where t is null or not(t=any(v.allowed_modes))) then raise exception 'Invalid measurement'; end if;
 if m ? 'trackLoad' and jsonb_typeof(m->'trackLoad') is distinct from 'boolean' then raise exception 'Invalid load tracking measurement'; end if;
end $$;
revoke all on function public.form_assert_execution_v1(text,jsonb,jsonb) from public,anon;
grant execute on function public.form_assert_execution_v1(text,jsonb,jsonb) to authenticated;
create or replace function public.form_v23_insert_sets(p_exercise_id uuid,p_prescription jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare n integer:=coalesce((p_prescription->>'sets')::integer,1); m jsonb:=p_prescription->'measurement';
begin
  if auth.uid() is null or not exists(select 1 from public.workout_exercises e join public.workout_runs r on r.id=e.workout_run_id and r.user_id=e.user_id where e.id=p_exercise_id and e.user_id=auth.uid() and e.status='pending' and r.status in ('prepared','inProgress')) then raise exception 'Active exercise unavailable'; end if;
  perform public.form_assert_execution_v1(e.selected_variation_id,e.exercise_snapshot,p_prescription) from public.workout_exercises e where e.id=p_exercise_id and e.user_id=auth.uid();
  if n<1 or n>20 or jsonb_typeof(m->'types') is distinct from 'array' or jsonb_array_length(m->'types')<>1 or m->'types'->>0 not in ('reps','duration','breaths') then raise exception 'Invalid prescription'; end if;
  if ((p_prescription->>'targetReps')::integer is not null and (m->'types'->>0<>'reps' or (p_prescription->>'targetReps')::integer<1)) or ((p_prescription->>'targetDurationSeconds')::numeric is not null and (m->'types'->>0<>'duration' or (p_prescription->>'targetDurationSeconds')::numeric<=0)) or ((p_prescription->>'targetBreaths')::integer is not null and (m->'types'->>0<>'breaths' or (p_prescription->>'targetBreaths')::integer<1)) then raise exception 'Measurement targets do not match'; end if;
  insert into public.workout_sets(user_id,workout_exercise_id,order_index,target_load,target_reps,target_duration_seconds,target_breaths,measurement_snapshot,target_rpe,target_rir,rest_seconds,tempo)
  select auth.uid(),p_exercise_id,i,(p_prescription->>'targetLoad')::numeric,(p_prescription->>'targetReps')::integer,(p_prescription->>'targetDurationSeconds')::integer,(p_prescription->>'targetBreaths')::integer,m,(p_prescription->>'targetRPE')::numeric,(p_prescription->>'targetRIR')::numeric,(p_prescription->>'restSeconds')::integer,p_prescription->>'tempo' from generate_series(0,n-1) i;
end $$;

create or replace function public.form_update_training_plan_v23(p_plan_id uuid,p_expected_updated_at timestamptz,p_draft jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare p public.training_plans; s jsonb; t jsonb; sid uuid; tid uuid; sids uuid[]:='{}'; tids uuid[]; old_sessions jsonb; old_intents jsonb; offidx integer; n integer; idx integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into p from public.training_plans where id=p_plan_id and user_id=auth.uid() and status<>'deleted' for update;
  if not found then raise exception 'Plan unavailable'; end if;
  if p.updated_at is distinct from p_expected_updated_at then raise exception 'Plan changed elsewhere. Reload.' using errcode='40001'; end if;
  if jsonb_typeof(p_draft->'sessions') is distinct from 'array' or jsonb_array_length(p_draft->'sessions')<1 or coalesce(length(trim(p_draft->>'name')),0)=0 then raise exception 'Invalid Plan'; end if;
  select coalesce(jsonb_object_agg(order_index::text,id::text),'{}'),coalesce(max(order_index),0)+count(*)+20 into old_sessions,offidx from public.session_templates where plan_id=p.id and user_id=auth.uid() and retired_at is null;
  update public.session_templates set order_index=order_index+offidx+10000 where plan_id=p.id and user_id=auth.uid();
  idx:=0;
  for s in select value from jsonb_array_elements(p_draft->'sessions') loop
    if (s->>'order')::integer<>idx or jsonb_typeof(s->'intents') is distinct from 'array' or jsonb_array_length(s->'intents') not between 1 and 10 then raise exception 'Session needs 1-10 ordered actions'; end if;
    sid:=coalesce((s->>'id')::uuid,(old_sessions->>idx::text)::uuid);
    if sid is not null then
      if not exists(select 1 from public.session_templates where id=sid and user_id=auth.uid() and plan_id=p.id and retired_at is null) then raise exception 'Session ownership mismatch'; end if;
      update public.session_templates set name=s->>'name',purpose=s->>'purpose',order_index=idx,design_notes=coalesce(s->'designNotes','{}')||jsonb_build_object('warmupBlock',s->'warmupBlock') where id=sid and user_id=auth.uid();
    else
      insert into public.session_templates(user_id,plan_id,name,purpose,order_index,design_notes) values(auth.uid(),p.id,s->>'name',s->>'purpose',idx,coalesce(s->'designNotes','{}')||jsonb_build_object('warmupBlock',s->'warmupBlock')) returning id into sid;
    end if;
    sids:=array_append(sids,sid);tids:='{}';
    select coalesce(jsonb_object_agg(order_index::text,id::text),'{}'),coalesce(max(order_index),0)+count(*)+20 into old_intents,offidx from public.training_intents where session_template_id=sid and user_id=auth.uid() and retired_at is null;
    update public.training_intents set order_index=order_index+offidx+10000 where session_template_id=sid and user_id=auth.uid();
    n:=0;
    for t in select value from jsonb_array_elements(s->'intents') loop
      if (t->>'order')::integer<>n or coalesce(length(t->>'defaultVariationId'),0)=0 then raise exception 'Invalid ordered action'; end if;
      perform public.form_assert_execution_v1(t->>'defaultVariationId',jsonb_build_object('variationId',t->>'defaultVariationId','exerciseId',(select exercise_id from public.form_variation_execution_catalog where variation_id=t->>'defaultVariationId')),coalesce(t->'prescription','{}'));
      if exists(select 1 from jsonb_array_elements_text(coalesce(t->'explicitOptionIds','[]')) opt where opt is null or not exists(select 1 from public.form_variation_execution_catalog c where c.variation_id=opt)) then raise exception 'Unknown explicit variation identity'; end if;
      -- Drafts carrying IDs preserve identity; new actions explicitly carry no ID.
      tid:=(t->>'id')::uuid;
      if tid is null and not(s ? 'id') then tid:=(old_intents->>n::text)::uuid; end if;
      if tid is not null then
        if not exists(select 1 from public.training_intents where id=tid and user_id=auth.uid() and session_template_id=sid and retired_at is null) then raise exception 'Intent ownership mismatch'; end if;
        update public.training_intents set label=t->>'label',order_index=n,movement_pattern=t->>'movementPattern',training_goal=t->>'trainingGoal',joint_function_id=t->>'jointFunctionId',default_variation_id=t->>'defaultVariationId',prescription=t->'prescription',training_role=t->>'trainingRole',rotation_joint_function_ids=case when t ? 'rotationJointFunctionIds' then array(select jsonb_array_elements_text(t->'rotationJointFunctionIds')) else null end where id=tid and user_id=auth.uid();
      else
        insert into public.training_intents(user_id,session_template_id,label,order_index,movement_pattern,training_goal,joint_function_id,default_variation_id,prescription,training_role,rotation_joint_function_ids)
        values(auth.uid(),sid,t->>'label',n,t->>'movementPattern',t->>'trainingGoal',t->>'jointFunctionId',t->>'defaultVariationId',t->'prescription',t->>'trainingRole',case when t ? 'rotationJointFunctionIds' then array(select jsonb_array_elements_text(t->'rotationJointFunctionIds')) else null end) returning id into tid;
      end if;
      tids:=array_append(tids,tid);
      delete from public.training_intent_options where training_intent_id=tid and user_id=auth.uid();
      insert into public.training_intent_options(user_id,training_intent_id,variation_id,order_index) select auth.uid(),tid,value,ordinality-1 from jsonb_array_elements_text(coalesce(t->'explicitOptionIds','[]')) with ordinality;
      n:=n+1;
    end loop;
    update public.training_intents set retired_at=coalesce(retired_at,now()) where session_template_id=sid and user_id=auth.uid() and not(id=any(tids));
    with retired as(select id,row_number() over(order by order_index,id)+100 as pos from public.training_intents where session_template_id=sid and user_id=auth.uid() and retired_at is not null)
    update public.training_intents t set order_index=retired.pos from retired where t.id=retired.id and t.user_id=auth.uid();
    idx:=idx+1;
  end loop;
  update public.session_templates set retired_at=coalesce(retired_at,now()) where plan_id=p.id and user_id=auth.uid() and not(id=any(sids));
  with retired as(select id,row_number() over(order by order_index,id)+100 as pos from public.session_templates where plan_id=p.id and user_id=auth.uid() and retired_at is not null)
  update public.session_templates s set order_index=retired.pos from retired where s.id=retired.id and s.user_id=auth.uid();
  update public.training_plans set name=p_draft->>'name',goal_summary=p_draft->>'goalSummary',cycle_name=p_draft->>'cycleName',cycle_focus=p_draft->>'cycleFocus',rationale=p_draft->>'rationale',planned_weeks=(p_draft->>'plannedWeeks')::integer,expected_sessions_per_week=(p_draft->>'expectedSessionsPerWeek')::integer,start_date=(p_draft->>'startDate')::date,end_date=(p_draft->>'endDate')::date where id=p.id and user_id=auth.uid();
end $$;

create or replace function public.form_prepare_workout_v23(p_session_id uuid,p_expected_plan_updated_at timestamptz,p_previous_run_id uuid,p_snapshot jsonb,p_exercises jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.training_plans; s public.session_templates; r public.workout_runs; prev uuid; item jsonb; tid uuid; eid uuid; rid uuid; n integer; i integer:=0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into s from public.session_templates where id=p_session_id and user_id=auth.uid() and retired_at is null;
  if not found then raise exception 'Session unavailable'; end if;
  select * into p from public.training_plans where id=s.plan_id and user_id=auth.uid() and status<>'deleted' for update;
  if not found then raise exception 'Plan unavailable'; end if;
  select * into r from public.workout_runs where user_id=auth.uid() and status in ('prepared','inProgress') limit 1;
  if found then
    if r.source_session_template_id<>s.id or not exists(select 1 from public.workout_exercises where workout_run_id=r.id and user_id=auth.uid()) then raise exception 'Existing workout unavailable; reset it first'; end if;
    return r.id;
  end if;
  if p.updated_at is distinct from p_expected_plan_updated_at then raise exception 'Plan changed. Reload.' using errcode='40001'; end if;
  select id into prev from public.workout_runs where user_id=auth.uid() and source_plan_id=p.id and status in ('completed','abandoned') and reverted_at is null order by created_at desc limit 1;
  if prev is distinct from p_previous_run_id then raise exception 'Workout progression changed. Reload.' using errcode='40001'; end if;
  select count(*) into n from public.training_intents where session_template_id=s.id and user_id=auth.uid() and retired_at is null;
  if n not between 1 and 10 or jsonb_typeof(p_exercises) is distinct from 'array' or jsonb_array_length(p_exercises)<>n then raise exception 'Invalid workout action count'; end if;
  if (select count(distinct x->>'sourceIntentId') from jsonb_array_elements(p_exercises) x)<>n then raise exception 'Duplicate source intent'; end if;
  insert into public.workout_runs(user_id,source_plan_id,source_session_template_id,status,session_snapshot) values(auth.uid(),p.id,s.id,'prepared',p_snapshot) returning id into rid;
  for item in select value from jsonb_array_elements(p_exercises) loop
    tid:=(item->>'sourceIntentId')::uuid;
    if not exists(select 1 from public.training_intents where id=tid and user_id=auth.uid() and session_template_id=s.id and retired_at is null and default_variation_id=item->>'originalDefaultVariationId') or (item->>'order')::integer<>i or item->'exerciseSnapshot'->>'variationId' is distinct from item->>'selectedVariationId' then raise exception 'Invalid workout source'; end if;
    perform public.form_assert_execution_v1(item->>'selectedVariationId',item->'exerciseSnapshot',item->'prescription');
    insert into public.workout_exercises(user_id,workout_run_id,source_intent_id,order_index,intent_snapshot,default_variation_id,selected_variation_id,exercise_snapshot,status)
    values(auth.uid(),rid,tid,i,item->'intentSnapshot',item->>'defaultVariationId',item->>'selectedVariationId',item->'exerciseSnapshot','pending') returning id into eid;
    perform public.form_v23_insert_sets(eid,item->'prescription');i:=i+1;
  end loop;
  return rid;
end $$;

create or replace function public.form_mutate_workout_v23(p_run_id uuid,p_expected_version integer,p_action text,p_payload jsonb,p_sync_plan boolean default false,p_expected_plan_updated_at timestamptz default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare r public.workout_runs; e public.workout_exercises; p public.training_plans; t public.training_intents; eid uuid; tid uuid; n integer; pos integer; offidx integer; pres jsonb; intent jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  -- Shared order with prepare/update: lock Plan before Run when touching both.
  if p_sync_plan then
    select p0.* into p from public.training_plans p0 join public.workout_runs r0 on r0.source_plan_id=p0.id and r0.user_id=p0.user_id where r0.id=p_run_id and p0.user_id=auth.uid() and p0.status<>'deleted' for update of p0;
    if not found or p.updated_at is distinct from p_expected_plan_updated_at then raise exception 'Plan changed or unavailable. Reload.' using errcode='40001'; end if;
  end if;
  select * into r from public.workout_runs where id=p_run_id and user_id=auth.uid() for update;
  if not found or r.status not in ('prepared','inProgress') then raise exception 'Active workout unavailable'; end if;
  if p_expected_version is null or r.version is distinct from p_expected_version then raise exception 'Workout changed elsewhere. Reload.' using errcode='40001'; end if;
  select count(*) into n from public.workout_exercises where workout_run_id=r.id and user_id=auth.uid();
  if p_action in ('remove','replace') then
    select * into e from public.workout_exercises where id=(p_payload->>'exerciseId')::uuid and workout_run_id=r.id and user_id=auth.uid() for update;
    if not found or e.status not in ('pending','inProgress') then raise exception 'Completed or missing action cannot be changed'; end if;
    perform 1 from public.workout_sets where workout_exercise_id=e.id and user_id=auth.uid() for update;
    if p_sync_plan then
      select * into t from public.training_intents where id=e.source_intent_id and user_id=auth.uid() and session_template_id=r.source_session_template_id and retired_at is null for update;
      if not found then raise exception 'Original intent unavailable; use workout-only change'; end if;
    end if;
  end if;
  if p_action='remove' then
    if n<=1 or exists(select 1 from public.workout_sets where workout_exercise_id=e.id and user_id=auth.uid() and completed) then raise exception 'Keep one action; completed sets cannot be deleted'; end if;
    if p_sync_plan then
      if (select count(*) from public.training_intents where session_template_id=t.session_template_id and user_id=auth.uid() and retired_at is null)<=1 then raise exception 'Plan needs one action'; end if;
      select coalesce(max(order_index),0)+100 into offidx from public.training_intents where session_template_id=t.session_template_id and user_id=auth.uid();
      update public.training_intents set retired_at=now(),order_index=offidx where id=t.id and user_id=auth.uid();
      -- Shift active indices into a disjoint range before compacting.
      update public.training_intents set order_index=order_index+offidx+100 where session_template_id=t.session_template_id and user_id=auth.uid() and retired_at is null;
      with ranked as(select id,row_number() over(order by order_index)-1 as pos from public.training_intents where session_template_id=t.session_template_id and user_id=auth.uid() and retired_at is null)
      update public.training_intents x set order_index=ranked.pos from ranked where x.id=ranked.id and x.user_id=auth.uid();
    end if;
    delete from public.workout_exercises where id=e.id and user_id=auth.uid();
    select coalesce(max(order_index),0)+100 into offidx from public.workout_exercises where workout_run_id=r.id and user_id=auth.uid();
    update public.workout_exercises set order_index=order_index+offidx where workout_run_id=r.id and user_id=auth.uid();
    with ranked as(select id,row_number() over(order by order_index)-1 as pos from public.workout_exercises where workout_run_id=r.id and user_id=auth.uid())
    update public.workout_exercises x set order_index=ranked.pos from ranked where x.id=ranked.id and x.user_id=auth.uid();
  elsif p_action in ('add','replace') then
    if coalesce(length(p_payload->>'variationId'),0)=0 or p_payload->'snapshot'->>'variationId' is distinct from p_payload->>'variationId' or coalesce(length(p_payload->'snapshot'->>'exerciseId'),0)=0 then raise exception 'Invalid action snapshot'; end if;
    if exists(select 1 from public.workout_exercises where workout_run_id=r.id and user_id=auth.uid() and (p_action='add' or id<>e.id) and (selected_variation_id=p_payload->>'variationId' or exercise_snapshot->>'exerciseId'=p_payload->'snapshot'->>'exerciseId')) then raise exception 'Action already selected'; end if;
    if p_action='add' then
      if n>=10 then raise exception 'Workout supports at most 10 actions'; end if;
      intent:=p_payload->'intent';pres:=intent->'prescription';
      perform public.form_assert_execution_v1(p_payload->>'variationId',p_payload->'snapshot',pres);
      if p_sync_plan then
        select count(*) into pos from public.training_intents where session_template_id=r.source_session_template_id and user_id=auth.uid() and retired_at is null;
        if pos>=10 or not exists(select 1 from public.session_templates where id=r.source_session_template_id and user_id=auth.uid() and plan_id=p.id and retired_at is null) then raise exception 'Plan cannot receive action'; end if;
        insert into public.training_intents(user_id,session_template_id,label,order_index,movement_pattern,training_goal,joint_function_id,default_variation_id,prescription,training_role) values(auth.uid(),r.source_session_template_id,intent->>'label',pos,intent->>'movementPattern',intent->>'trainingGoal',intent->>'jointFunctionId',p_payload->>'variationId',pres,'optional') returning id into tid;
      end if;
      insert into public.workout_exercises(user_id,workout_run_id,source_intent_id,order_index,intent_snapshot,default_variation_id,selected_variation_id,exercise_snapshot,status) values(auth.uid(),r.id,tid,n,intent,p_payload->>'variationId',p_payload->>'variationId',p_payload->'snapshot','pending') returning id into eid;
      perform public.form_v23_insert_sets(eid,pres);
    else
      pres:=p_payload->'prescription';
      perform public.form_assert_execution_v1(p_payload->>'variationId',p_payload->'snapshot',pres);
      if exists(select 1 from public.workout_sets where workout_exercise_id=e.id and user_id=auth.uid() and completed) then raise exception 'Completed sets cannot be relabeled'; end if;
      if exists(select 1 from public.workout_sets where workout_exercise_id=e.id and user_id=auth.uid() and (actual_load is not null or actual_reps is not null or actual_duration_seconds is not null or actual_breaths is not null or actual_rpe is not null or actual_rir is not null)) and (coalesce((p_payload->>'adjustMeasurement')::boolean,false) or e.exercise_snapshot->>'exerciseId' is distinct from p_payload->'snapshot'->>'exerciseId' or e.exercise_snapshot->>'loadTrackingType' is distinct from p_payload->'snapshot'->>'loadTrackingType' or e.selected_variation_id is distinct from p_payload->>'variationId') then raise exception 'Recorded set semantics differ; clear unfinished inputs explicitly'; end if;
      if e.selected_variation_id=p_payload->>'variationId' then raise exception 'Action already selected'; end if;
      if coalesce((p_payload->>'adjustMeasurement')::boolean,false) then
        if exists(select 1 from public.workout_sets where workout_exercise_id=e.id and user_id=auth.uid() and completed) then raise exception 'Completed sets cannot change measurement'; end if;
        if jsonb_typeof(pres->'measurement'->'types') is distinct from 'array' or jsonb_array_length(pres->'measurement'->'types')<>1 then raise exception 'Invalid measurement'; end if;
        update public.workout_sets set measurement_snapshot=pres->'measurement',target_reps=(pres->>'targetReps')::integer,target_duration_seconds=(pres->>'targetDurationSeconds')::integer,target_breaths=(pres->>'targetBreaths')::integer,target_load=(pres->>'targetLoad')::numeric,actual_reps=null,actual_duration_seconds=null,actual_breaths=null,actual_load=null where workout_exercise_id=e.id and user_id=auth.uid();
      elsif coalesce(pres->'measurement','null') is distinct from coalesce(e.intent_snapshot->'prescription'->'measurement','null') then raise exception 'Explicit measurement adjustment required'; end if;
      -- Run/exercise/set locks are already held; transaction rollback includes this bump.
      update public.workout_sets set version=version+1 where workout_exercise_id=e.id and user_id=auth.uid();
      update public.workout_exercises set selected_variation_id=p_payload->>'variationId',exercise_snapshot=p_payload->'snapshot',intent_snapshot=jsonb_set(intent_snapshot,'{prescription}',pres),replacement_reason=p_payload->>'reason',replacement_note=p_payload->>'note' where id=e.id and user_id=auth.uid();
      if p_sync_plan then
        update public.training_intents set default_variation_id=p_payload->>'variationId',prescription=pres where id=t.id and user_id=auth.uid();
        delete from public.training_intent_options where training_intent_id=t.id and user_id=auth.uid();
      end if;
    end if;
  else raise exception 'Unknown workout change'; end if;
  if p_sync_plan then update public.training_plans set updated_at=now() where id=p.id and user_id=auth.uid(); end if;
  update public.workout_runs set version=version+1 where id=r.id and user_id=auth.uid();
  return r.version+1;
end $$;

revoke all on function public.form_v23_insert_sets(uuid,jsonb) from public,anon;
revoke all on function public.form_update_training_plan_v23(uuid,timestamptz,jsonb) from public,anon;
revoke all on function public.form_prepare_workout_v23(uuid,timestamptz,uuid,jsonb,jsonb) from public,anon;
revoke all on function public.form_mutate_workout_v23(uuid,integer,text,jsonb,boolean,timestamptz) from public,anon;
grant execute on function public.form_v23_insert_sets(uuid,jsonb),public.form_update_training_plan_v23(uuid,timestamptz,jsonb),public.form_prepare_workout_v23(uuid,timestamptz,uuid,jsonb,jsonb),public.form_mutate_workout_v23(uuid,integer,text,jsonb,boolean,timestamptz) to authenticated;

notify pgrst, 'reload schema';
commit;
