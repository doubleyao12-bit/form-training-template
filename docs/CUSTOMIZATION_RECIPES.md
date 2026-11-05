# Executable customization recipes

Read [the map](CUSTOMIZATION_MAP.md) and [quickstart](QUICKSTART.md). No recipe authorizes database or cloud operations by itself. These recipes use existing capabilities, not new product features.

## A — Home dumbbell, four Sessions

Ask: dumbbell range, bench availability, whether bodyweight is allowed, experience, desired duration and fixed weekdays versus completion-order rotation. Current FORM supports plan import, editing and substitutions, not a global equipment whitelist or fixed weekly scheduler.

Prerequisites: approved requirements, existing execution IDs, isolated configured app for eventual persistence. Read src/plan-import.ts, src/library-v1.ts, src/replacement-engine.ts, src/warmup.ts and src/training-playbook.ts.

1. Propose the Session count separately from weekly frequency and obtain approval before generating JSON. Four weekly workouts may rotate two Sessions A/B/A/B; build four distinct Sessions only if requested. Use current IDs and inspect every main exercise equipment array and alternatives.
2. Inspect the chosen warmupProfile and all default/replacement warm-up choices. Existing profiles may use bodyweight or other equipment; do not call a draft strictly dumbbell-only until these conditions are confirmed. If existing profile choices do not meet requirements, stop and propose a separate L2 change.
3. Explain that replacement candidate grouping/ranking does not enforce a universal equipment whitelist.
4. Show prescriptions and equipment dependencies, obtain confirmation, validate JSON, preview through the app and confirm save as a new plan.
5. Run npm run test:plan-import, npm run test:replacement-repositories, npm run test:warmup and full regression.

Common errors: unknown ID → choose an existing exact identity; unsupported measurement → use its allowed mode; wrong equipment → change plan selection, not identity definitions. Recovery: retain the previous plan and switch back when lifecycle guards permit; do not delete history. A strict equipment policy and automatic weekday scheduling remain unsupported.

## B — AI-generated import draft

Ask goal, equipment and time first; ask history/overwrite intent before applying. Current protocol is form.plan-import.v1, defined and validated in src/plan-import.ts by parseAndValidatePlanImport. The domain types are in src/domain/training.ts.

1. Inspect the current strict schema and library; never invent fields or identities.
2. Present the goal, equipment, Session count and weekly-frequency proposal; wait for approval, then generate a new named synthetic draft, using contiguous zero-based Session/exercise order and an existing warmupProfile.
3. Validate with the real parser. A valid JSON document alone is insufficient.
4. Present resolved actions, measurement, alternatives and warnings. Obtain confirmation before save; prefer a new plan. Active-workout and overwrite guards must remain intact.
5. Run npm run test:plan-import and npm run test:plan-v2, then full regression. The checked example is [minimal-import.json](examples/minimal-import.json); it is a parser demonstration, not a complete training recommendation.

Errors: strict-schema rejection → remove invented fields; ambiguity → use exact Variation ID; mode mismatch → correct the prescription. Recovery: keep the prior plan intact and abandon the unsaved draft. Natural-language text is not itself an import protocol. Minimum real-cloud save/read-back passed; validate the user’s own environment separately.

## C — Change prescriptions, retain history

Ask which future Sessions/intents should change, whether an active workout exists, and whether the change is future-plan-only or workout-only. Read src/PlanEditor.tsx, src/plan-edit.ts, src/data/supabase/plan-repository.ts, src/data/supabase/workout-repository.ts and src/domain/training.ts.

1. Record the intended existing plan and proposed prescription differences; do not rewrite snapshots.
2. Confirm the scope. Existing version/lifecycle guards may require finishing, abandoning or reloading a workout; do not bypass them.
3. Prefer existing plan editing; use a new plan where the user wants a reversible alternative. Do not assume an import overwrite is a merge.
4. Validate measurements and version expectations, save only after approval, and check future behavior and preserved completed history in an authorized isolated environment.
5. Run npm run test:plan-v2, npm run test:flexible-training, npm run test:execution, npm run test:performance and full regression.

Errors: stale revision → reload and reconcile; incompatible measurement → ask before changing mode; pending writes → resolve through existing retry flow. Never clear the database, remove pending journal, reuse IDs or mutate completed snapshots. Recovery means an approved compensating plan edit or switching to the retained plan; it does not erase historical records. Minimum real Auth/REST/browser persistence passed; this does not certify every editing or failure path, nor a full local stack.
