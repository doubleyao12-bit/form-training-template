begin;

alter table public.training_intents
  add column prescription jsonb;

alter table public.training_intents
  add constraint training_intents_prescription_object
  check (prescription is null or jsonb_typeof(prescription) = 'object');

comment on column public.training_intents.prescription is
  'Optional target sets/load/reps/RPE/RIR/rest/tempo intent. Snapshotted into WorkoutSet rows when a run is prepared.';

commit;
