# Quickstart

## Get and open the source

When the GitHub template becomes available, use its template creation flow or obtain a clean source copy. Open its root in Codex/Cursor and read [AGENTS](../AGENTS.md), [AI_START_HERE](AI_START_HERE.md), [map](CUSTOMIZATION_MAP.md) and [recipes](CUSTOMIZATION_RECIPES.md). No repository URL or one-click deployment is promised.

Ask about goals, equipment and weekly training frequency. Agree a proposal and obtain approval before generating import JSON or editing code. Confirm actual import, overwrite and save separately. Four weekly workouts can use two Sessions A/B/A/B; four distinct Sessions are optional. Rotation follows completed Sessions, not weekdays. FORM does not validate scientific programming or provide an automatic AI coach.

## Install locked dependencies

Use Node 24 or 26 and npm >=10, matching package.json. From the project root:

```sh
node --version
npm --version
npm ci --no-audit --no-fund
```

Review lifecycle scripts before installation. The lockfile flags esbuild 0.25.12, Vite's nested esbuild 0.28.2 and optional fsevents 2.3.3. The esbuild scripts prepare/verify platform binaries and can fetch a missing binary from npm; inspect the exact package artifacts. fsevents is macOS-only; its lockfile lifecycle flag does not itself establish which script will run. npm 11 may report that install scripts are not yet covered by allowScripts. Do not approve them blindly; if the platform packages support the checks/build without those scripts, record that result. A successful npm ci does not prove lifecycle scripts ran. Keep optional dependencies enabled. Do not use sudo, upgrade the lockfile or copy another machine's node_modules. If scripts are disabled for review, installation alone is not acceptance: verify platform binaries and build before proceeding.

Run the existing offline checks:

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run validate:program
npm run validate:library
node --import ./tests/offline-register.mjs scripts/audit-tutorial-coverage.ts
```

The separate strict check below is expected to fail with 115 missing tutorials; it is not a clean-install failure:

```sh
node --import ./tests/offline-register.mjs scripts/audit-tutorial-coverage.ts --require-complete
```

## Initialize your own empty database

This section is a future setup procedure requiring your approval, not permission for an AI to act on an account. In Supabase Dashboard, create a NEW empty project in your chosen organization/region after checking its displayed cost and quota. Wait until ready. Do not use a production/existing database or someone else's project. Keep its database password and account tokens private.

Use a separately installed official [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started). Inspect the installed CLI's help first. No Docker or local Supabase stack is needed for this hosted-project migration route. Installing the CLI is a separate user-approved operation; it is not a FORM npm dependency.

```sh
supabase --version
supabase init --help
supabase link --help
supabase db push --help
supabase migration list --help
```

If supabase/config.toml is absent, run `supabase init` in this project root to generate local CLI configuration; never overwrite an existing config. Retain the committed migrations. With the owner completing login/password prompts, replace YOUR_NEW_PROJECT_REF with the new project's reference:

```sh
supabase login
supabase link --project-ref YOUR_NEW_PROJECT_REF
supabase migration list
supabase db push --dry-run
```

Confirm in Dashboard that this reference belongs to the approved empty project. The dry run must list exactly these 11 files in order:

1. 20260902000100_training_hub_cloud_foundation.sql
2. 20260908000100_training_hub_phase2_integrity.sql
3. 20260908000200_training_intent_prescription.sql
4. 20260908000300_training_playbook_plan_context.sql
5. 20260908000400_workout_revert_guard.sql
6. 20260916000100_training_hub_measurements.sql
7. 20260917000100_training_hub_execution_mutations.sql
8. 20260929160328_form_plan_soft_delete_and_atomic_update.sql
9. 20261016035901_form_flexible_training_v23.sql
10. 20261026031729_form_complete_execution_catalog.sql
11. 20261026031846_form_v23_execution_integration.sql

Only after approving that target and list:

```sh
supabase db push
supabase migration list
```

All 11 local and remote versions should agree, with no pending migration. Do not include seed data or extra SQL. On any failure, record the file/error and stop; do not reset, repair history, edit/reorder SQL or retry the whole initialization blindly.

In the approved project's SQL Editor, these READ-ONLY checks should show 10 public tables, all with RLS enabled, and the four named RPCs:

```sql
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'form_prepare_workout_v23', 'form_mutate_workout_v23',
  'form_delete_training_plan', 'revert_latest_training_hub_workout'
)
order by p.proname;
```

These are structure checks, not proof of all RLS paths. The [official CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push) documents link, migration list and dry-run/push. C1 successfully applied the exact 11 SQL files via the Supabase migration connector; it did NOT execute this CLI setup path. The connector assigned application-time history versions. Do not relink that acceptance database and blindly replay source versions. D2 reuses the existing test database without migration; clean CLI initialization remains a separately scoped verification.

## Configure Auth and public environment values

In your new project's Authentication settings, enable email/password signups, set Site URL and allowed redirect URL to your actual local frontend origin (for the command below, http://127.0.0.1:5173/). Use HTTPS URLs for any later authorized deployment. Ordinary FORM does not need OAuth or MCP.

Keep email confirmation enabled according to your security requirements. Register using an address you can receive mail at, follow the confirmation link, then return to sign in. Hosted email delivery has recipient/rate restrictions; the built-in sender is best-effort and not production SMTP. A missing confirmation email or 'email not confirmed' is an Auth delivery/configuration issue: inspect dashboard settings, recipient eligibility and limits; do not weaken RLS or put administrator keys in the browser. Production email needs an appropriate SMTP setup. See [password Auth](https://supabase.com/docs/guides/auth/passwords) and [SMTP limitations](https://supabase.com/docs/guides/auth/auth-smtp).

C1 disabled email confirmation ONLY in its separately approved synthetic-user test project. This is not FORM's default deployment requirement, and mail-delivery acceptance was not performed.

Copy the template locally:

```sh
cp .env.example .env.local
```

Set only your own Project URL and public publishable key (or supported legacy anon key), obtained from that project's Connect/API-key settings:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

VITE_ values ship to the browser. Never enter service_role, sb_secret_, database passwords or account tokens. The optional SUPABASE_ variables are for a separately configured MCP server, not prerequisites for ordinary training. Keep .env.local untracked. Restart Vite after environment changes. Match URL and key to the SAME approved project.

## Start the actual FORM App

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173/. The formal entry is src/main.tsx → src/CloudTrainingApp.tsx; legacy App.tsx and test fixtures are not the product. If the port is occupied, stop and choose another unused port; do not stop another service. Update Auth URLs to match. Vite alone does not serve optional MCP server endpoints.

## Import the public example and smoke-test

Validate the public synthetic parser example without writing any database:

```sh
node --import ./tests/offline-register.mjs --input-type=module -e 'import {readFileSync} from "node:fs"; import {parseAndValidatePlanImport} from "./src/plan-import.ts"; const r=parseAndValidatePlanImport(readFileSync("docs/examples/minimal-import.json","utf8")); if(!r.ok) {console.error(r.issues);process.exit(1)} console.log("Example valid:",r.draft.sessions.length,"Sessions");'
```

After signing into your approved environment, choose Plan → 导入方案. Paste docs/examples/minimal-import.json, parse/preview resolved actions, then explicitly confirm 另存为新计划. The four-Session, one-exercise-per-Session JSON is only a protocol demonstration, not a complete recommendation or a required plan structure. Other plans may have two Sessions and expectedSessionsPerWeek = 4. Do not overwrite a real plan for this test.

Check Today/Plan/Exercises/History/Profile, refresh and confirm plan state persists. In a disposable account, start a synthetic workout, record a set, complete the action/workout and read History; sign out/in to check recovery. Never claim account isolation from UI visibility alone: cross-user REST/RPC tests require ordinary-user JWTs in a separately approved test. Do not delete pending journal or historical snapshots to hide failures.

## Common errors and acceptance limits

- Missing cloud configuration: check both VITE_ variables and restart Vite.
- Invalid key/session or REST failure: confirm URL/key project match, actual login and email confirmation; do not bypass authorization.
- Missing table/RPC: check ordered migration history and schema in the intended project; do not replay against production.
- Invalid plan: use form.plan-import.v1, exact existing identities, supported scalar measurement fields and contiguous zero-based order. Do not loosen the Validator.
- esbuild/platform-module failure: check architecture, supported Node version and optional packages; do not copy binaries from another architecture.
- Permission or disk-space failure: stop and report; do not sudo or clean personal files automatically.

Prior evidence: 61/61 offline tests, types, lint and build passed; the unchanged 11 migrations and 6/6 minimum real-cloud business groups passed with real password Auth, ordinary JWTs, PostgREST and key RLS paths. Those paths covered three private tables and one RPC, not all permissions. Full local Supabase-stack, real confirmation-email delivery, production deployment and all failure paths remain unverified. D2 separately passed a clean npm ci from an empty dependency directory and fresh npm cache on macOS Apple Silicon, Node 26.7.0/npm 11.19.0; the fresh dependencies passed 61/61 tests, types, lint, build and the public JSON parser check despite npm 11 leaving unapproved lifecycle scripts blocked. This is one tested platform, not an all-platform installation guarantee. D2 loaded the formal login page; its separate authenticated browser smoke check was interrupted by browser control and is not claimed as passed. Do not infer publication approval. MIT and third-party notices remain; final MIT commercial-use/modification/redistribution acceptance belongs to the owner.

## Save recovery and local privacy

Wait for **Saved** before leaving a workout. **Retry** means some input is not confirmed saved. Reconnect and select Retry; repeated submissions are reconciled against the current set version. If two edits conflict, compare the displayed local and cloud actual values, then explicitly choose which to keep. The system saves a local conflict backup before resolving. Older drafts without a known base require review when they differ from cloud data; timestamps do not authorize overwriting.

Drafts and conflict backups contain training inputs in plain browser localStorage, scoped to this site's origin. Backups are not uploaded by this feature or automatically expired. Anyone with access to that browser profile can inspect them; use a private profile on shared devices. In the workout's **本机冲突备份与隐私** section, **清除我的本机冲突备份** asks for confirmation and removes only this user's conflict backups. It does not clear pending drafts or cloud history. Do not clear site storage, delete pending journals or reset the database to hide a save problem. Storage-full, malformed-draft or missing-set errors require review; do not close the page while it reports memory-only unsaved input.

The candidate update has offline and synthetic-repository browser coverage; these checks do not establish new real Supabase integration acceptance. Validate your independent environment before relying on recovery for real data.
