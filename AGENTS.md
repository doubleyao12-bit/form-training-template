# FORM agent operating rules

FORM is a personal training application template, not a public multi-tenant SaaS. Read [AI_START_HERE](docs/AI_START_HERE.md), [CUSTOMIZATION_MAP](docs/CUSTOMIZATION_MAP.md), [recipes](docs/CUSTOMIZATION_RECIPES.md), [quickstart](docs/QUICKSTART.md), README and rights notices before proposing changes.

## Actual entry and capabilities

src/main.tsx loads src/CloudTrainingApp.tsx and styles.css; /oauth/consent is a separate optional entry. Do not treat legacy src/App.tsx as the official application. Four Sessions cycle by completed order through resolveNextSession in src/core-loop.ts, not a fixed weekly calendar. Search/equipment grouping is not a global equipment whitelist. The 11 unchanged migrations and 6/6 minimum real-cloud acceptance groups passed against a new isolated Supabase project: real password Auth, ordinary-user JWTs, PostgREST, persistence and key RLS paths. RLS coverage is targeted, not exhaustive. Full local Supabase-stack acceptance remains pending.

## Consent workflow

Understand the request, read relevant code, classify it, offer a feasible minimal plan with limits and tests, then wait for user confirmation before generating import JSON or modifying the project. Actual import, overwrite and save require user confirmation too. Ask only information needed now, in small groups. Prefer existing plan import/editing and configuration before code changes.

L1: existing features, environment configuration or plan data. L2: limited UI/application changes. L3: training semantics, schema, permissions or new persistent identities. Even L1 database writes require a confirmed destination and intent. Stop and ask before changing requirements, Validator contracts, schema semantics, permissions, real data, costs or deployment targets.

## Protected boundaries

Preserve exercise and variation IDs, exact execution signatures, equipment/measurement semantics, plan prescriptions and historical snapshots. Do not repurpose IDs or rewrite old history. Do not delete pending journal or clear data to hide errors. Plan-only and workout-only changes are distinct.

Do not rewrite or reorder the 11 released migrations. New database changes require a separately approved compatibility plan and isolated validation. Never disable RLS or use privileged keys to bypass ownership. Browser VITE_ values are public: never place service_role or secret keys there. Do not print secrets.

Tutorials: 110 admitted mappings, 115 UNREVIEWED identities. Admission is technical matching, not copyright permission. Unknown IDs/signatures must not inherit tutorials. Do not expose candidate research or the deferred arm bar link.

Do not install dependencies/software, connect cloud accounts, authorize OAuth, migrate databases, deploy or publish without authorization. Never assume an existing project is disposable. Keep internal evidence, environment files, dependencies and generated artifacts out of source exports.

## Verification and report

Inspect package.json before running commands. For authorized changes run npm test, npm run typecheck, npm run lint, npm run build, npm run validate:program and the tutorial audit described in QUICKSTART. Add relevant plan-import, replacement, measurement or performance checks. UI changes need browser validation; database changes need separate real Auth/REST/RLS acceptance. Report blocked checks honestly. Strict tutorial coverage must still fail while gaps remain.

Final report: request and approved scope; changed files and reasons; baseline/identity/migration protection; actual commands and results including failures; unverified behavior and risks; recovery instructions; next approval needed. Never claim publication approval from local tests.
