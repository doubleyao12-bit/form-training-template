\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
create function pg_temp.check_true(ok boolean,message text) returns void language plpgsql as $$begin if ok is not true then raise exception 'ASSERT: %',message;end if;end$$;
create function pg_temp.payload(sid uuid) returns jsonb language sql as $$
select jsonb_agg(jsonb_build_object('sourceIntentId',id,'order',order_index,'originalDefaultVariationId',default_variation_id,'defaultVariationId',default_variation_id,'selectedVariationId',default_variation_id,'intentSnapshot',jsonb_build_object('label',label,'order',order_index,'defaultVariationId',default_variation_id,'explicitOptionIds','[]'::jsonb,'prescription',prescription),'exerciseSnapshot',jsonb_build_object('exerciseId',default_variation_id,'variationId',default_variation_id,'nameZh',label,'nameEn',label),'prescription',prescription) order by order_index) from public.training_intents where session_template_id=sid and retired_at is null
$$;
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
insert into public.training_plans(id,user_id,name) values('20000000-0000-0000-0000-000000000001',auth.uid(),'Synthetic A');
insert into public.session_templates(id,user_id,plan_id,name,order_index) values('30000000-0000-0000-0000-000000000001',auth.uid(),'20000000-0000-0000-0000-000000000001','A',0);
insert into public.training_intents(id,user_id,session_template_id,label,order_index,default_variation_id,prescription)
select ('40000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,auth.uid(),'30000000-0000-0000-0000-000000000001','Action '||i,i-1,'legacy-'||i||'--legacy-default','{"sets":2,"targetReps":8,"measurement":{"version":1,"types":["reps"],"trackLoad":true}}'::jsonb from generate_series(1,3)i;

do $$declare sid uuid:='30000000-0000-0000-0000-000000000001';pid uuid:='20000000-0000-0000-0000-000000000001';revision timestamptz;bad jsonb;rid uuid;eid uuid;newid uuid;ver integer;failed boolean;before_count integer;history uuid;history_before jsonb;active_before jsonb;draft jsonb;n integer;prev uuid;
begin
  select updated_at into revision from public.training_plans where id=pid;
  bad:=jsonb_set(pg_temp.payload(sid),'{1,prescription,measurement,trackLoad}','"invalid"');
  failed:=false;begin perform public.form_prepare_workout_v23(sid,revision,null,'{"name":"A","order":0}',bad);exception when check_violation then failed:=true;end;
  perform pg_temp.check_true(failed,'mid-prepare constraint failure exercised');
  perform pg_temp.check_true((select count(*)=0 from public.workout_runs),'failed prepare leaves zero runs');
  perform pg_temp.check_true((select count(*)=0 from public.workout_exercises),'failed prepare leaves zero exercises');
  rid:=public.form_prepare_workout_v23(sid,revision,null,'{"name":"A","order":0}',pg_temp.payload(sid));
  perform pg_temp.check_true((select count(*)=3 from public.workout_exercises where workout_run_id=rid),'3 actions atomically prepared');
  perform pg_temp.check_true((select count(*)=6 from public.workout_sets),'all sets atomically prepared');
  perform pg_temp.check_true(public.form_prepare_workout_v23(sid,revision,null,'{}','[]')=rid,'duplicate prepare returns same occurrence');
  select id into eid from public.workout_exercises where workout_run_id=rid and order_index=0;
  ver:=public.form_mutate_workout_v23(rid,1,'replace',jsonb_build_object('exerciseId',eid,'variationId','new-action','snapshot',jsonb_build_object('exerciseId','new','variationId','new-action'),'prescription','{"sets":2,"targetReps":8,"measurement":{"version":1,"types":["reps"],"trackLoad":true}}'::jsonb));
  perform pg_temp.check_true((select default_variation_id='legacy-1--legacy-default' from public.training_intents where order_index=0),'workout-only replace leaves Plan unchanged');
  ver:=public.form_mutate_workout_v23(rid,ver,'add','{"variationId":"temp","snapshot":{"variationId":"temp","exerciseId":"temp"},"intent":{"label":"Temporary","prescription":{"sets":1,"targetReps":6,"measurement":{"version":1,"types":["reps"],"trackLoad":true}}}}');
  select id into newid from public.workout_exercises where workout_run_id=rid and selected_variation_id='temp';
  perform pg_temp.check_true((select count(*)=3 from public.training_intents where retired_at is null),'workout-only add leaves Plan unchanged');
  ver:=public.form_mutate_workout_v23(rid,ver,'remove',jsonb_build_object('exerciseId',newid));
  perform pg_temp.check_true((select count(*)=3 from public.workout_exercises where workout_run_id=rid),'temporary removal restored occurrence count');
  failed:=false;begin perform public.form_mutate_workout_v23(rid,1,'remove',jsonb_build_object('exerciseId',eid));exception when serialization_failure then failed:=true;end;
  perform pg_temp.check_true(failed,'optimistic locking rejects stale mutation');
  -- Freeze a synthetic completed workout, then create a separate active occurrence.
  update public.workout_runs set status='completed',completed_at=clock_timestamp() where id=rid;
  history:=rid;
  select jsonb_build_object('run',to_jsonb(r),'exercises',(select jsonb_agg(to_jsonb(e)) from public.workout_exercises e where workout_run_id=r.id),'sets',(select jsonb_agg(to_jsonb(s)) from public.workout_sets s join public.workout_exercises e on e.id=s.workout_exercise_id where e.workout_run_id=r.id)) into history_before from public.workout_runs r where id=history;
  rid:=public.form_prepare_workout_v23(sid,revision,history,'{"name":"A","order":0}',pg_temp.payload(sid));
  select id into eid from public.workout_exercises where workout_run_id=rid and order_index=0;
  ver:=public.form_mutate_workout_v23(rid,1,'replace',jsonb_build_object('exerciseId',eid,'variationId','future','snapshot',jsonb_build_object('exerciseId','future','variationId','future'),'prescription','{"sets":2,"targetReps":8,"measurement":{"version":1,"types":["reps"],"trackLoad":true}}'::jsonb),true,revision);
  perform pg_temp.check_true((select default_variation_id='future' from public.training_intents where order_index=0),'explicit future-default sync persisted');
  failed:=false;begin perform public.form_mutate_workout_v23(rid,ver,'replace',jsonb_build_object('exerciseId',eid,'variationId','stale'),true,'2000-01-01');exception when serialization_failure then failed:=true;end;
  perform pg_temp.check_true(failed and (select selected_variation_id='future' from public.workout_exercises where id=eid),'stale Plan sync does not partially replace current workout');
  update public.workout_sets set completed=true where workout_exercise_id=eid and order_index=0;
  failed:=false;begin perform public.form_mutate_workout_v23(rid,ver,'remove',jsonb_build_object('exerciseId',eid));exception when raise_exception then failed:=true;end;
  perform pg_temp.check_true(failed,'completed set blocks action deletion');
  update public.workout_sets set completed=false where workout_exercise_id=eid;
  ver:=public.form_mutate_workout_v23(rid,ver,'replace',jsonb_build_object('exerciseId',eid,'variationId','hold','snapshot',jsonb_build_object('exerciseId','hold','variationId','hold'),'adjustMeasurement',true,'prescription','{"sets":2,"targetDurationSeconds":30,"measurement":{"version":1,"types":["duration"],"trackLoad":false}}'::jsonb));
  perform pg_temp.check_true((select bool_and(target_duration_seconds=30 and target_reps is null and measurement_snapshot->'types'='["duration"]') from public.workout_sets where workout_exercise_id=eid),'explicit measurement adjustment round-trip');
  select updated_at into revision from public.training_plans where id=pid;
  ver:=public.form_mutate_workout_v23(rid,ver,'add','{"variationId":"sync","snapshot":{"variationId":"sync","exerciseId":"sync"},"intent":{"label":"Synced","prescription":{"sets":1,"targetReps":6,"measurement":{"version":1,"types":["reps"],"trackLoad":true}}}}',true,revision);
  select id into newid from public.workout_exercises where workout_run_id=rid and selected_variation_id='sync';
  perform pg_temp.check_true((select count(*)=4 from public.training_intents where retired_at is null),'sync add updated Plan');
  select updated_at into revision from public.training_plans where id=pid;
  ver:=public.form_mutate_workout_v23(rid,ver,'remove',jsonb_build_object('exerciseId',newid),true,revision);
  perform pg_temp.check_true((select count(*)=3 from public.training_intents where retired_at is null),'sync remove retired Plan intent');
  -- Plan edit while a workout exists must leave that generated snapshot unchanged.
  select jsonb_agg(to_jsonb(e) order by order_index) into active_before from public.workout_exercises e where workout_run_id=rid;
  select jsonb_build_object('name','Edited','sessions',jsonb_build_array(jsonb_build_object('id',sid,'name','A','order',0,'intents',jsonb_agg(jsonb_build_object('id',id,'label',label,'order',order_index,'defaultVariationId',default_variation_id,'prescription',prescription,'trainingRole','anchor') order by order_index)))) into draft from public.training_intents where session_template_id=sid and retired_at is null;
  select updated_at into revision from public.training_plans where id=pid;
  perform public.form_update_training_plan_v23(pid,revision,draft);
  perform pg_temp.check_true((select jsonb_agg(to_jsonb(e) order by order_index)=active_before from public.workout_exercises e where workout_run_id=rid),'Plan edit does not rewrite generated actions');
  perform pg_temp.check_true((select bool_and(training_role='anchor') from public.training_intents where retired_at is null),'roles persist');
  -- Vary formal action count and confirm the next generated workout uses that count.
  update public.workout_runs set status='abandoned' where id=rid;
  foreach n in array array[3,4,5,6,8] loop
    select jsonb_build_object('name','Count test','sessions',jsonb_build_array(jsonb_build_object('name','A','order',0,'intents',(select jsonb_agg(jsonb_build_object('label','Count '||i,'order',i-1,'defaultVariationId','count-'||i,'prescription','{"sets":1,"targetReps":8,"measurement":{"version":1,"types":["reps"],"trackLoad":true}}'::jsonb)) from generate_series(1,n)i)))) into draft;
    select updated_at into revision from public.training_plans where id=pid;
    perform public.form_update_training_plan_v23(pid,revision,draft);
    select updated_at into revision from public.training_plans where id=pid;
    select id into prev from public.workout_runs where source_plan_id=pid and status in ('completed','abandoned') and reverted_at is null order by created_at desc limit 1;
    rid:=public.form_prepare_workout_v23(sid,revision,prev,'{"name":"A","order":0}',pg_temp.payload(sid));
    perform pg_temp.check_true((select count(*)=n from public.workout_exercises where workout_run_id=rid),'next workout count '||n);
    update public.workout_runs set status='abandoned' where id=rid;
  end loop;
  perform pg_temp.check_true((select jsonb_build_object('run',to_jsonb(r),'exercises',(select jsonb_agg(to_jsonb(e)) from public.workout_exercises e where workout_run_id=r.id),'sets',(select jsonb_agg(to_jsonb(s)) from public.workout_sets s join public.workout_exercises e on e.id=s.workout_exercise_id where e.workout_run_id=r.id))=history_before from public.workout_runs r where id=history),'historical run/exercises/sets byte-equivalent after all changes');
  failed:=false;begin perform public.form_mutate_workout_v23(history,1,'remove',jsonb_build_object('exerciseId',eid));exception when raise_exception then failed:=true;end;
  perform pg_temp.check_true(failed,'completed workout mutation rejected');
  select updated_at into revision from public.training_plans where id=pid;
  select id into prev from public.workout_runs where source_plan_id=pid and status in ('completed','abandoned') and reverted_at is null order by created_at desc limit 1;
  perform public.form_prepare_workout_v23(sid,revision,prev,'{"name":"A","order":0}',pg_temp.payload(sid));
end$$;
select set_config('form.test_run',(select id::text from public.workout_runs where status='prepared' limit 1),true);
set local request.jwt.claim.sub='10000000-0000-0000-0000-000000000002';
do $$declare failed boolean;begin
  perform pg_temp.check_true((select count(*)=0 from public.training_plans),'B cannot read A Plan');
  perform pg_temp.check_true((select count(*)=0 from public.workout_sets),'B cannot read A set data');
  failed:=false;begin perform public.form_prepare_workout_v23('30000000-0000-0000-0000-000000000001',now(),null,'{}','[]');exception when raise_exception then failed:=true;end;perform pg_temp.check_true(failed,'B cannot prepare A session');
  failed:=false;begin perform public.form_update_training_plan_v23('20000000-0000-0000-0000-000000000001',now(),'{}');exception when raise_exception then failed:=true;end;perform pg_temp.check_true(failed,'B cannot change A Plan');
  failed:=false;begin perform public.form_mutate_workout_v23(current_setting('form.test_run')::uuid,1,'add','{}');exception when raise_exception then failed:=sqlerrm='Active workout unavailable';end;perform pg_temp.check_true(failed,'B cannot mutate actual active A workout');
end$$;
insert into public.training_plans(id,user_id,name) values('20000000-0000-0000-0000-000000000002',auth.uid(),'Synthetic B');
insert into public.session_templates(id,user_id,plan_id,name,order_index) values('30000000-0000-0000-0000-000000000002',auth.uid(),'20000000-0000-0000-0000-000000000002','B',0);
insert into public.training_intents(user_id,session_template_id,label,order_index,default_variation_id,prescription) values(auth.uid(),'30000000-0000-0000-0000-000000000002','B',0,'B-action','{"sets":1,"targetReps":8,"measurement":{"version":1,"types":["reps"],"trackLoad":true}}');
select set_config('form.test_b_run',public.form_prepare_workout_v23('30000000-0000-0000-0000-000000000002',(select updated_at from public.training_plans where id='20000000-0000-0000-0000-000000000002'),null,'{"name":"B","order":0}',pg_temp.payload('30000000-0000-0000-0000-000000000002'))::text,true);
set local request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
do $$declare failed boolean;begin
  perform pg_temp.check_true(not exists(select 1 from public.training_plans where id='20000000-0000-0000-0000-000000000002'),'A cannot read B Plan');
  failed:=false;begin perform public.form_mutate_workout_v23(current_setting('form.test_b_run')::uuid,1,'add','{}');exception when raise_exception then failed:=sqlerrm='Active workout unavailable';end;perform pg_temp.check_true(failed,'A cannot mutate active B Workout');
end$$;
set local role anon;
set local request.jwt.claim.sub='';
do $$declare failed boolean;begin failed:=false;begin perform public.form_prepare_workout_v23('30000000-0000-0000-0000-000000000001',now(),null,'{}','[]');exception when insufficient_privilege then failed:=true;end;perform pg_temp.check_true(failed,'anon RPC denied');end$$;
rollback;
\echo 'PASS: atomic prepare rollback, 3/4/5/6/8, temporary/synced mutations, measurement, roles, history, RLS, locking'
