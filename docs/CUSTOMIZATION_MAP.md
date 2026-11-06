# Customization map

All changes preserve IDs, signatures, measurement, snapshots, RLS and released migration bytes. Commands below are npm run script names (test is npm test). The 11 unchanged migrations and 6/6 minimum real-cloud acceptance groups passed against a new isolated Supabase project: real password Auth, ordinary-user JWTs, PostgREST, persistence and key RLS paths. RLS coverage is targeted, not exhaustive. Full local Supabase-stack acceptance remains pending.

## Dumbbells only

- Support/level: L1 plan; L2 persistent restrictions.
- Lowest-cost plan: Choose existing dumbbell variations; review warm-ups, alternatives and required bench/bodyweight allowances.
- Entry: [src/plan-import.ts](../src/plan-import.ts), `parseAndValidatePlanImport`.
- Constraints, user decision and missing verification: No global equipment whitelist; confirm allowed accessories.
- Checks: test:plan-import, test:replacement-repositories, plus full offline regression.

## Four weekly workouts versus four distinct Sessions

- Support/level: L1; L2/L3 calendar development.
- Lowest-cost plan: Set expectedSessionsPerWeek to 4 for weekly frequency; choose two ordered Sessions for A/B/A/B or four only if the user wants four distinct lessons.
- Entry: [src/core-loop.ts](../src/core-loop.ts), `resolveNextSession`.
- Constraints, user decision and missing verification: Completion-order cycle is not fixed weekdays; confirm calendar intent.
- Checks: test:plan-v2, plus full offline regression.

## Hypertrophy

- Support/level: L1.
- Lowest-cost plan: Adjust approved exercise selection and prescriptions.
- Entry: [src/training-playbook.ts](../src/training-playbook.ts), `createExampleTrainingPlan`.
- Constraints, user decision and missing verification: No automatic optimal programming; confirm experience, time and volume.
- Checks: validate:program, test:execution, plus full offline regression.

## Running plus strength

- Support/level: L1 arrangement; L3 running data.
- Lowest-cost plan: Arrange strength around user-specified running days.
- Entry: [src/measurement.ts](../src/measurement.ts), `newRunPrescription`.
- Constraints, user decision and missing verification: No full running log; do not invent distance/pace fields. Confirm whether scheduling or recording is wanted.
- Checks: test:measurement, plus full offline regression.

## Exclude movements

- Support/level: L1 plan; L2/L3 persistent preference.
- Lowest-cost plan: Replace/remove from the plan and review recommendations.
- Entry: [src/replacement-engine.ts](../src/replacement-engine.ts), `replacementCandidates`.
- Constraints, user decision and missing verification: No account-wide exclusion list; confirm scope and affected warm-ups.
- Checks: test:replacement-repositories, plus full offline regression.

## Custom exercises

- Support/level: L3.
- Lowest-cost plan: Prefer existing execution identities; propose catalog and server compatibility before adding one.
- Entry: [src/library-v1.ts](../src/library-v1.ts), `exerciseLibraryV1`.
- Constraints, user decision and missing verification: Legacy App.tsx editing is not the official custom-exercise flow. New server catalog support is not a user setting.
- Checks: validate:library, test:plan-import, plus full offline regression.

## Home layout

- Support/level: L2.
- Lowest-cost plan: Change Today composition only after agreeing layout.
- Entry: [src/CloudTrainingApp.tsx](../src/CloudTrainingApp.tsx), `Today`.
- Constraints, user decision and missing verification: Preserve start/save/error/navigation behavior; responsive browser checks pending.
- Checks: test, build, plus full offline regression.

## Name and colors

- Support/level: L2.
- Lowest-cost plan: Edit visible copy and CSS variables, not identities or storage keys.
- Entry: [src/styles.css](../src/styles.css), `:root`.
- Constraints, user decision and missing verification: No unified brand configuration; confirm mobile appearance and accessible contrast.
- Checks: lint, build, plus full offline regression.

## Simplify tutorials

- Support/level: L2.
- Lowest-cost plan: Reduce visible tutorial UI while preserving catalog/history.
- Entry: [src/WorkoutScreen.tsx](../src/WorkoutScreen.tsx), `WorkoutScreen`.
- Constraints, user decision and missing verification: Keep admission guards, rights notices and missing states; confirm hidden versus removed UI.
- Checks: test, build, plus full offline regression.

## Import a plan

- Support/level: L1.
- Lowest-cost plan: Agree the proposal first; then generate exact current JSON protocol, preview and confirm save.
- Entry: [src/plan-import.ts](../src/plan-import.ts), `PLAN_IMPORT_VERSION`.
- Constraints, user decision and missing verification: Reject unknown/ambiguous references; confirm new versus overwrite. Minimum real-cloud save/reload passed; other environments still need validation.
- Checks: test:plan-import, plus full offline regression.

## More statistics

- Support/level: L2 derived; L3 new storage.
- Lowest-cost plan: Define a metric from existing evidence before adding fields.
- Entry: [src/performance-profile.ts](../src/performance-profile.ts), `aggregatePerformance`.
- Constraints, user decision and missing verification: Respect measurement modes, missing records and reverted runs; confirm metric meaning.
- Checks: test:performance, test:training-review, plus full offline regression.

## Private deployment

- Support/level: L1 configuration with L3 operational controls.
- Lowest-cost plan: Prepare an independent environment, validate then deploy only after approval.
- Entry: [src/data/supabase/client.ts](../src/data/supabase/client.ts), `getSupabaseClient`.
- Constraints, user decision and missing verification: Minimum real-cloud Auth/REST/browser paths passed; deployment and full local stack remain unverified; confirm target, account access, cost and isolation.
- Checks: typecheck, build, plus full offline regression.

## Search and save-recovery boundaries

- Search: `src/exercise-search.ts` supplies normalized multi-term matching through `src/catalog-search.ts`; `ReplacementSheet` keeps its existing warm-up, selected-action and replacement constraints. IDs remain stable and searchable. This does not enforce an equipment whitelist.
- Saves: `src/workout-save-queue.ts`, `src/pending-journal.ts` and `WorkoutScreen` reconcile per-set drafts via the existing version-checked repository. Preserve explicit conflict confirmation, current-user/active-workout checks, and historical values. `src/conflict-backups.ts` stores and explicitly clears current-user local backups; never delete pending drafts as a repair strategy.
- Run save queue, adapter, backup and search regressions plus browser recovery checks when changing these boundaries. Simulated browser transports do not verify cloud RLS.
