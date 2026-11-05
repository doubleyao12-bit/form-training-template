-- Run against a disposable/local Supabase database as an administrative role.
-- The transaction always rolls back.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'training-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'training-b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.training_plans (id, user_id, name) values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'User A plan'),
  ('22000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'User B plan');

insert into public.session_templates (id, user_id, plan_id, name, order_index) values
  ('11100000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'A session', 0),
  ('22200000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'B session', 0);

insert into public.workout_runs (id, user_id, source_plan_id, source_session_template_id, session_snapshot) values
  ('11110000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '11100000-0000-0000-0000-000000000001', '{"name":"A session","order":0,"capturedAt":"2026-09-02T00:00:00Z"}'),
  ('22220000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', '22200000-0000-0000-0000-000000000002', '{"name":"B session","order":0,"capturedAt":"2026-09-02T00:00:00Z"}');

insert into public.workout_exercises (id, user_id, workout_run_id, order_index, intent_snapshot, default_variation_id, selected_variation_id, exercise_snapshot) values
  ('11111000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000001', 0, '{"label":"A intent","order":0,"defaultVariationId":"a","explicitOptionIds":[]}', 'a', 'a', '{"exerciseId":"a","variationId":"a","nameZh":"A","nameEn":"A"}'),
  ('22222000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '22220000-0000-0000-0000-000000000002', 0, '{"label":"B intent","order":0,"defaultVariationId":"b","explicitOptionIds":[]}', 'b', 'b', '{"exerciseId":"b","variationId":"b","nameZh":"B","nameEn":"B"}');

insert into public.workout_sets (id, user_id, workout_exercise_id, order_index) values
  ('11111100-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '11111000-0000-0000-0000-000000000001', 0),
  ('22222200-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '22222000-0000-0000-0000-000000000002', 0);

set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';

do $$
begin
  if (select count(*) from public.training_plans) <> 1 then raise exception 'RLS failure: User A can read another user plan'; end if;
  if (select count(*) from public.workout_runs) <> 1 then raise exception 'RLS failure: User A can read another user workout'; end if;
  if (select count(*) from public.workout_sets) <> 1 then raise exception 'RLS failure: User A can read another user set'; end if;

  begin
    insert into public.training_plans (user_id, name) values ('20000000-0000-0000-0000-000000000002', 'Forbidden');
    raise exception 'RLS failure: User A inserted a User B plan';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.workout_sets set completed = true where id = '22222200-0000-0000-0000-000000000002';
    if found then raise exception 'RLS failure: User A updated a User B set'; end if;
  end;
end $$;

rollback;
