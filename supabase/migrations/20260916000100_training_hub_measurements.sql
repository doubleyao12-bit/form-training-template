begin;

-- Nullable additive fields: existing rows retain their original reps semantics.
alter table public.workout_sets
  add column target_duration_seconds numeric,
  add column actual_duration_seconds numeric,
  add column target_breaths integer,
  add column actual_breaths integer,
  add column measurement_snapshot jsonb,
  add constraint workout_sets_duration_nonnegative check (
    (target_duration_seconds is null or target_duration_seconds >= 0) and
    (actual_duration_seconds is null or actual_duration_seconds >= 0)),
  add constraint workout_sets_breaths_nonnegative check (
    (target_breaths is null or target_breaths >= 0) and
    (actual_breaths is null or actual_breaths >= 0)),
  add constraint workout_sets_measurement_snapshot_valid check (
    measurement_snapshot is null or (
      jsonb_typeof(measurement_snapshot) = 'object' and
      measurement_snapshot->>'version' = '1' and
      jsonb_typeof(measurement_snapshot->'trackLoad') = 'boolean' and
      jsonb_typeof(measurement_snapshot->'types') = 'array' and
      jsonb_array_length(measurement_snapshot->'types') between 1 and 3 and
      measurement_snapshot->'types' <@ '["reps","duration","breaths"]'::jsonb
    ) is true);

-- No updates/backfill; existing ownership policies and triggers remain in force.
commit;
