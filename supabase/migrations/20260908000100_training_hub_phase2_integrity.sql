begin;

create unique index workout_runs_one_active_per_user_idx
  on public.workout_runs(user_id)
  where status in ('prepared', 'inProgress');

drop policy workout_runs_update_own on public.workout_runs;
create policy workout_runs_update_own on public.workout_runs for update to authenticated
  using ((select auth.uid()) = user_id and status <> 'completed')
  with check ((select auth.uid()) = user_id);
drop policy workout_runs_delete_own on public.workout_runs;
create policy workout_runs_delete_own on public.workout_runs for delete to authenticated
  using ((select auth.uid()) = user_id and status <> 'completed');

drop policy workout_exercises_insert_own on public.workout_exercises;
create policy workout_exercises_insert_own on public.workout_exercises for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.workout_runs r where r.id = workout_run_id and r.user_id = (select auth.uid()) and r.status <> 'completed'));
drop policy workout_exercises_update_own on public.workout_exercises;
create policy workout_exercises_update_own on public.workout_exercises for update to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.workout_runs r where r.id = workout_run_id and r.user_id = (select auth.uid()) and r.status <> 'completed'))
  with check ((select auth.uid()) = user_id);
drop policy workout_exercises_delete_own on public.workout_exercises;
create policy workout_exercises_delete_own on public.workout_exercises for delete to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.workout_runs r where r.id = workout_run_id and r.user_id = (select auth.uid()) and r.status <> 'completed'));

drop policy workout_sets_insert_own on public.workout_sets;
create policy workout_sets_insert_own on public.workout_sets for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.workout_exercises e join public.workout_runs r on r.id = e.workout_run_id where e.id = workout_exercise_id and e.user_id = (select auth.uid()) and r.user_id = (select auth.uid()) and r.status <> 'completed'));
drop policy workout_sets_update_own on public.workout_sets;
create policy workout_sets_update_own on public.workout_sets for update to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.workout_exercises e join public.workout_runs r on r.id = e.workout_run_id where e.id = workout_exercise_id and e.user_id = (select auth.uid()) and r.user_id = (select auth.uid()) and r.status <> 'completed'))
  with check ((select auth.uid()) = user_id);
drop policy workout_sets_delete_own on public.workout_sets;
create policy workout_sets_delete_own on public.workout_sets for delete to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.workout_exercises e join public.workout_runs r on r.id = e.workout_run_id where e.id = workout_exercise_id and e.user_id = (select auth.uid()) and r.user_id = (select auth.uid()) and r.status <> 'completed'));

commit;
