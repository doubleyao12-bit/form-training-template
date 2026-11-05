\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.training_plans(id,user_id,name,status,expected_sessions_per_week)
values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','A Plan','active',2);
insert into public.session_templates(id,user_id,plan_id,name,order_index)
values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A Session',0);
insert into public.training_intents(id,user_id,session_template_id,label,order_index,default_variation_id)
values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Squat',0,'back-squat--legacy-default');
insert into public.workout_runs(id,user_id,source_plan_id,source_session_template_id,status,session_snapshot,completed_at)
values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','inProgress','{"name":"A Session","order":0,"capturedAt":"2026-09-01T00:00:00Z"}',null);
insert into public.workout_exercises(id,user_id,workout_run_id,source_intent_id,order_index,intent_snapshot,default_variation_id,selected_variation_id,exercise_snapshot,status)
values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc',0,'{"label":"Squat","order":0,"defaultVariationId":"back-squat--legacy-default","explicitOptionIds":[]}','back-squat--legacy-default','back-squat--legacy-default','{"exerciseId":"back-squat","variationId":"back-squat--legacy-default","nameZh":"杠铃后蹲","nameEn":"Back Squat"}','completed');
insert into public.workout_sets(id,user_id,workout_exercise_id,order_index,actual_load,actual_reps,completed)
values('ffffffff-ffff-4fff-8fff-ffffffffffff','11111111-1111-4111-8111-111111111111','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',0,60,5,true);
update public.workout_runs set status='completed',completed_at=now() where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select public.form_update_training_plan(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select updated_at from public.training_plans where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  '{"name":"A Plan Edited","goalSummary":"Goal","expectedSessionsPerWeek":2,"sessions":[{"name":"A Session Edited","purpose":"Strength","order":0,"warmupBlock":{"id":"warmup-a","version":"0.1","title":"Squat Prep","focus":"Hip","defaultRounds":2,"exercises":[]},"intents":[{"label":"Squat Anchor","order":0,"defaultVariationId":"goblet-squat--legacy-default","explicitOptionIds":["back-squat--legacy-default"],"prescription":{"sets":3,"targetReps":8}}]}]}'::jsonb
);
do $$ begin
  if (select name from public.training_plans where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'A Plan Edited' then raise exception 'Plan metadata not updated'; end if;
  if (select count(*) from public.session_templates where plan_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1 then raise exception 'Plan ID/session changed'; end if;
  if (select name from public.session_templates where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 'A Session Edited' then raise exception 'Session not updated'; end if;
  if (select default_variation_id from public.training_intents where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 'goblet-squat--legacy-default' then raise exception 'Intent not updated'; end if;
  if (select count(*) from public.training_intent_options where training_intent_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 then raise exception 'Options not updated'; end if;
  if (select count(*) from public.workout_runs where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd') <> 1 then raise exception 'History run lost'; end if;
  if (select actual_load from public.workout_sets where id='ffffffff-ffff-4fff-8fff-ffffffffffff') <> 60 then raise exception 'History set changed'; end if;
end $$;
do $$ begin
  begin
    perform public.form_update_training_plan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2020-01-01T00:00:00Z','{"name":"Stale","sessions":[]}'::jsonb);
    raise exception 'Stale Plan edit allowed';
  exception when others then if sqlerrm='Stale Plan edit allowed' then raise; end if; end;
end $$;
do $$ begin
  begin
    perform public.form_update_training_plan(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      (select updated_at from public.training_plans where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      '{"name":"Must Roll Back","sessions":[{"name":"Changed First","order":0,"intents":[{"label":"Valid","order":0,"defaultVariationId":"back-squat--legacy-default"}]},{"order":1,"intents":[{"label":"Valid","order":0,"defaultVariationId":"back-squat--legacy-default"}]}]}'::jsonb
    );
    raise exception 'Invalid nested draft accepted';
  exception when others then if sqlerrm='Invalid nested draft accepted' then raise; end if; end;
  if (select name from public.training_plans where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'A Plan Edited'
    then raise exception 'Failed nested edit partially changed Plan'; end if;
  if (select name from public.session_templates where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 'A Session Edited'
    then raise exception 'Failed nested edit partially changed Session'; end if;
end $$;

insert into public.workout_runs(id,user_id,source_plan_id,source_session_template_id,status,session_snapshot)
values('aaaaaaaa-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','prepared','{"name":"A Session"}');
insert into public.workout_exercises(id,user_id,workout_run_id,order_index,intent_snapshot,default_variation_id,selected_variation_id,exercise_snapshot,status)
values
('aaaaaaaa-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','aaaaaaaa-1111-4111-8111-111111111111',0,'{"label":"Pull","order":0,"defaultVariationId":"pull-up--default","explicitOptionIds":[]}','pull-up--default','pull-up--default','{"exerciseId":"pull-up","variationId":"pull-up--default","nameZh":"引体向上","nameEn":"Pull-Up"}','pending'),
('aaaaaaaa-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','aaaaaaaa-1111-4111-8111-111111111111',1,'{"label":"Chin","order":1,"defaultVariationId":"chin-up--default","explicitOptionIds":[]}','chin-up--default','chin-up--default','{"exerciseId":"chin-up","variationId":"chin-up--default","nameZh":"反握引体向上","nameEn":"Chin-Up"}','pending');
select public.replace_training_hub_exercise(
  'aaaaaaaa-2222-4222-8222-222222222222',
  (select version from public.workout_runs where id='aaaaaaaa-1111-4111-8111-111111111111'),
  'pull-up--assisted',
  '{"exerciseId":"pull-up","variationId":"pull-up--assisted","nameZh":"辅助引体向上","nameEn":"Assisted Pull-Up"}'
);
do $$ begin
  if (select selected_variation_id from public.workout_exercises where id='aaaaaaaa-2222-4222-8222-222222222222') <> 'pull-up--assisted' then raise exception 'Same Exercise variation rejected'; end if;
  begin perform public.replace_training_hub_exercise(
    'aaaaaaaa-2222-4222-8222-222222222222',
    (select version from public.workout_runs where id='aaaaaaaa-1111-4111-8111-111111111111'),
    'chin-up--default',
    '{"exerciseId":"chin-up","variationId":"chin-up--default","nameZh":"反握引体向上","nameEn":"Chin-Up"}'
  ); raise exception 'Other-slot duplicate allowed';
  exception when others then if sqlerrm='Other-slot duplicate allowed' then raise; end if; end;
end $$;
do $$ begin
  begin perform public.form_delete_training_plan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Active workout deletion allowed';
  exception when others then if sqlerrm='Active workout deletion allowed' then raise; end if; end;
  begin perform public.form_update_training_plan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',(select updated_at from public.training_plans where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'{"name":"Wrong","sessions":[]}'::jsonb); raise exception 'Active workout edit allowed';
  exception when others then if sqlerrm='Active workout edit allowed' then raise; end if; end;
end $$;
update public.workout_runs set status='abandoned' where id='aaaaaaaa-1111-4111-8111-111111111111';
select public.form_delete_training_plan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$ begin
  if (select status from public.training_plans where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'deleted' then raise exception 'Plan not soft deleted'; end if;
  if (select count(*) from public.workout_runs where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd') <> 1 then raise exception 'History disappeared'; end if;
  if (select source_plan_id from public.workout_runs where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd') <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then raise exception 'History source identity changed'; end if;
end $$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
  if exists(select 1 from public.training_plans where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'Cross-user Plan SELECT allowed'; end if;
  if exists(select 1 from public.workout_runs where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd') then raise exception 'Cross-user History SELECT allowed'; end if;
  begin perform public.form_delete_training_plan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Cross-user delete allowed';
  exception when others then if sqlerrm='Cross-user delete allowed' then raise; end if; end;
  begin perform public.form_update_training_plan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now(),'{"name":"Wrong","sessions":[]}'::jsonb); raise exception 'Cross-user update allowed';
  exception when others then if sqlerrm='Cross-user update allowed' then raise; end if; end;
end $$;
insert into public.training_plans(id,user_id,name,status)
values('bbbbbbbb-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','B Plan','active');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  if exists(select 1 from public.training_plans where id='bbbbbbbb-1111-4111-8111-111111111111') then raise exception 'A can read B Plan'; end if;
  begin perform public.form_delete_training_plan('bbbbbbbb-1111-4111-8111-111111111111'); raise exception 'A can delete B Plan';
  exception when others then if sqlerrm='A can delete B Plan' then raise; end if; end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform public.form_delete_training_plan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Anon delete RPC allowed';
  exception when others then if sqlerrm='Anon delete RPC allowed' then raise; end if; end;
  begin perform public.form_update_training_plan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now(),'{}'::jsonb); raise exception 'Anon edit RPC allowed';
  exception when others then if sqlerrm='Anon edit RPC allowed' then raise; end if; end;
  begin
    if exists(select 1 from public.training_plans where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'Anon Plan SELECT allowed'; end if;
  exception when others then if sqlerrm='Anon Plan SELECT allowed' then raise; end if; end;
end $$;
rollback;
