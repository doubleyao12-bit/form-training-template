begin;

create table public.training_playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  version text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  positioning text not null,
  core_principles jsonb not null default '[]'::jsonb check (jsonb_typeof(core_principles) = 'array'),
  organization_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(organization_rules) = 'array'),
  frequency_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(frequency_rules) = 'array'),
  plan_change_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(plan_change_rules) = 'array'),
  effectiveness_criteria jsonb not null default '[]'::jsonb check (jsonb_typeof(effectiveness_criteria) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name, version)
);

alter table public.training_plans
  add column playbook_id uuid,
  add column rationale text,
  add column planned_weeks integer check (planned_weeks is null or planned_weeks > 0),
  add column expected_sessions_per_week numeric check (expected_sessions_per_week is null or expected_sessions_per_week > 0),
  add foreign key (playbook_id, user_id) references public.training_playbooks(id, user_id) on delete set null (playbook_id);

alter table public.session_templates
  add column design_notes jsonb,
  add constraint session_templates_design_notes_object check (design_notes is null or jsonb_typeof(design_notes) = 'object');

create index training_playbooks_user_status_idx on public.training_playbooks(user_id, status, updated_at desc);
create index training_plans_playbook_idx on public.training_plans(user_id, playbook_id);

create trigger training_playbooks_updated_at before update on public.training_playbooks for each row execute function public.set_training_hub_updated_at();

alter table public.training_playbooks enable row level security;
grant select, insert, update, delete on public.training_playbooks to authenticated;
create policy training_playbooks_select_own on public.training_playbooks for select to authenticated using ((select auth.uid()) = user_id);
create policy training_playbooks_insert_own on public.training_playbooks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy training_playbooks_update_own on public.training_playbooks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy training_playbooks_delete_own on public.training_playbooks for delete to authenticated using ((select auth.uid()) = user_id);

comment on table public.training_playbooks is 'Long-lived personal training methodology. Plans reference it but workouts do not duplicate it.';
comment on column public.session_templates.design_notes is 'Plan-level WHY/WHAT context: primary/secondary capacities, rationale, sequence, recovery load, and review hypothesis.';

commit;
