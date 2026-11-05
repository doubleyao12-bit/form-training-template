begin;

create extension if not exists pgcrypto;

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  goal_summary text,
  cycle_name text,
  cycle_focus text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null,
  name text not null,
  purpose text,
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (plan_id, order_index),
  foreign key (plan_id, user_id) references public.training_plans(id, user_id) on delete cascade
);

create table public.training_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_template_id uuid not null,
  label text not null,
  order_index integer not null check (order_index >= 0),
  movement_pattern text,
  training_goal text,
  joint_function_id text,
  default_variation_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (session_template_id, order_index),
  foreign key (session_template_id, user_id) references public.session_templates(id, user_id) on delete cascade
);

create table public.training_intent_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_intent_id uuid not null,
  variation_id text not null,
  order_index integer not null check (order_index >= 0),
  rationale text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (training_intent_id, variation_id),
  foreign key (training_intent_id, user_id) references public.training_intents(id, user_id) on delete cascade
);

create table public.workout_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_plan_id uuid,
  source_session_template_id uuid,
  status text not null default 'prepared' check (status in ('prepared', 'inProgress', 'completed', 'abandoned')),
  session_snapshot jsonb not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (source_plan_id, user_id) references public.training_plans(id, user_id) on delete set null (source_plan_id),
  foreign key (source_session_template_id, user_id) references public.session_templates(id, user_id) on delete set null (source_session_template_id)
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_run_id uuid not null,
  source_intent_id uuid,
  order_index integer not null check (order_index >= 0),
  intent_snapshot jsonb not null,
  default_variation_id text not null,
  selected_variation_id text not null,
  actual_variation_id text,
  replacement_reason text check (replacement_reason is null or replacement_reason in ('equipmentUnavailable', 'painOrDiscomfort', 'difficultyAdjustment', 'preference', 'coachInstruction', 'other')),
  replacement_note text,
  exercise_snapshot jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'inProgress', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (workout_run_id, order_index),
  foreign key (workout_run_id, user_id) references public.workout_runs(id, user_id) on delete cascade,
  foreign key (source_intent_id, user_id) references public.training_intents(id, user_id) on delete set null
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_exercise_id uuid not null,
  order_index integer not null check (order_index >= 0),
  target_load numeric,
  target_reps integer,
  target_rpe numeric,
  target_rir numeric,
  rest_seconds integer,
  tempo text,
  actual_load numeric,
  actual_reps integer,
  actual_rpe numeric,
  actual_rir numeric,
  completed boolean not null default false,
  note text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (workout_exercise_id, order_index),
  foreign key (workout_exercise_id, user_id) references public.workout_exercises(id, user_id) on delete cascade
);

create table public.migration_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  source_fingerprint text not null,
  status text not null check (status in ('started', 'completed', 'failed', 'needsReview')),
  record_counts jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id),
  unique (user_id, source_key, source_fingerprint)
);

create index training_plans_user_status_idx on public.training_plans(user_id, status);
create index session_templates_plan_idx on public.session_templates(user_id, plan_id, order_index);
create index training_intents_session_idx on public.training_intents(user_id, session_template_id, order_index);
create index workout_runs_user_status_idx on public.workout_runs(user_id, status, created_at desc);
create index workout_exercises_run_idx on public.workout_exercises(user_id, workout_run_id, order_index);
create index workout_sets_exercise_idx on public.workout_sets(user_id, workout_exercise_id, order_index);

create or replace function public.set_training_hub_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger training_plans_updated_at before update on public.training_plans for each row execute function public.set_training_hub_updated_at();
create trigger session_templates_updated_at before update on public.session_templates for each row execute function public.set_training_hub_updated_at();
create trigger training_intents_updated_at before update on public.training_intents for each row execute function public.set_training_hub_updated_at();
create trigger workout_runs_updated_at before update on public.workout_runs for each row execute function public.set_training_hub_updated_at();
create trigger workout_exercises_updated_at before update on public.workout_exercises for each row execute function public.set_training_hub_updated_at();
create trigger workout_sets_updated_at before update on public.workout_sets for each row execute function public.set_training_hub_updated_at();

alter table public.training_plans enable row level security;
alter table public.session_templates enable row level security;
alter table public.training_intents enable row level security;
alter table public.training_intent_options enable row level security;
alter table public.workout_runs enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.migration_imports enable row level security;

grant select, insert, update, delete on public.training_plans to authenticated;
grant select, insert, update, delete on public.session_templates to authenticated;
grant select, insert, update, delete on public.training_intents to authenticated;
grant select, insert, update, delete on public.training_intent_options to authenticated;
grant select, insert, update, delete on public.workout_runs to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
grant select, insert, update, delete on public.migration_imports to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'training_plans','session_templates','training_intents','training_intent_options',
    'workout_runs','workout_exercises','workout_sets','migration_imports'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;

commit;
