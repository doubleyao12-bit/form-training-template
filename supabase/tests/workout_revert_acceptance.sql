-- Real-schema acceptance test. All fixtures are rolled back.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'revert-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'revert-b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.training_plans (id, user_id, name) values
  ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'A plan'),
  ('41000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', 'B plan');

insert into public.session_templates (id, user_id, plan_id, name, order_index) values
  ('31100000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', 'A', 0),
  ('31200000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', 'B', 1),
  ('41100000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '41000000-0000-0000-0000-000000000004', 'B own', 0);

insert into public.workout_runs (id, user_id, source_plan_id, source_session_template_id, status, session_snapshot, completed_at) values
  ('31110000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', '31100000-0000-0000-0000-000000000003', 'completed', '{"name":"A","order":0,"capturedAt":"2026-09-01T00:00:00Z"}', '2026-09-01T01:00:00Z'),
  ('31210000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', '31200000-0000-0000-0000-000000000003', 'completed', '{"name":"B","order":1,"capturedAt":"2026-09-02T00:00:00Z"}', '2026-09-02T01:00:00Z'),
  ('41110000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '41000000-0000-0000-0000-000000000004', '41100000-0000-0000-0000-000000000004', 'completed', '{"name":"B own","order":0,"capturedAt":"2026-09-03T00:00:00Z"}', '2026-09-03T01:00:00Z');

insert into public.workout_exercises (id, user_id, workout_run_id, order_index, intent_snapshot, default_variation_id, selected_variation_id, actual_variation_id, exercise_snapshot, status) values
  ('31111000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '31110000-0000-0000-0000-000000000003', 0, '{"label":"A","order":0,"defaultVariationId":"test-v","explicitOptionIds":[]}', 'test-v', 'test-v', 'test-v', '{"exerciseId":"test","variationId":"test-v","nameZh":"A","nameEn":"A"}', 'completed'),
  ('31211000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '31210000-0000-0000-0000-000000000003', 0, '{"label":"B","order":0,"defaultVariationId":"test-v","explicitOptionIds":[]}', 'test-v', 'test-v', 'test-v', '{"exerciseId":"test","variationId":"test-v","nameZh":"B","nameEn":"B"}', 'completed');

set local role authenticated;
set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';

do $$
begin
  begin
    perform public.revert_latest_training_hub_workout('31110000-0000-0000-0000-000000000003', 1, 'accidentalCompletion');
    raise exception 'Older workout was reverted.';
  exception when sqlstate 'P0001' then null;
  end;

  perform public.revert_latest_training_hub_workout('31210000-0000-0000-0000-000000000003', 1, 'accidentalCompletion');
  if not exists (select 1 from public.workout_runs where id = '31210000-0000-0000-0000-000000000003' and status = 'completed' and reverted_at is not null and version = 2) then
    raise exception 'Latest workout was not soft-reverted.';
  end if;

  begin
    perform public.revert_latest_training_hub_workout('31110000-0000-0000-0000-000000000003', 1, 'other');
    raise exception 'Earlier workout became revertible after latest was reverted.';
  exception when sqlstate 'P0001' then null;
  end;

  begin
    perform public.revert_latest_training_hub_workout('41110000-0000-0000-0000-000000000004', 1, 'other');
    raise exception 'User A reverted User B workout.';
  exception when sqlstate 'P0001' then null;
  end;

  if (select count(*) from public.workout_runs where status = 'completed') <> 2 then raise exception 'History RLS or preservation failed.'; end if;
  if (select id from public.workout_runs where status = 'completed' and reverted_at is null order by completed_at desc limit 1) <> '31110000-0000-0000-0000-000000000003' then raise exception 'Reverted workout was not excluded from progression/performance candidate query.'; end if;
end $$;

reset role;
do $$ begin
  if exists (select 1 from public.workout_runs where id = '41110000-0000-0000-0000-000000000004' and reverted_at is not null) then raise exception 'User B workout was changed.'; end if;
end $$;

rollback;

select 'passed' as workout_revert_acceptance;
