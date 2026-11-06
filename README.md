# FORM

FORM is a personal training application template for people who want to fork and customize their own training workflow, including with AI assistance. It is not a public multi-tenant SaaS.

## Features and boundaries

201 exercises and 225 execution identities; JSON plan import, plan editing and switching, exercise replacement, workout execution and measurement, warm-ups, retry handling, history and performance review. Email/password authentication uses your own Supabase environment. MCP/OAuth is optional and experimental.

Tutorials: 110 admitted mappings and 115 explicitly UNREVIEWED identities. Unreviewed links are hidden. Matching is not redistribution permission.

## Local setup

Node 24 or 26 and npm >=10 are required. Use the committed lockfile. Review dependency lifecycle scripts before installing. With installation approved, use the lockfile (do not omit optional platform packages):

```sh
npm ci --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
```

A compatible esbuild platform package must be available. The lockfile marks two esbuild postinstall scripts and optional fsevents; inspect the exact artifacts before running lifecycle scripts. See [Quickstart](docs/QUICKSTART.md) for independent backend setup, installation checks and troubleshooting. No Docker is required for the hosted-backend path.

Copy .env.example to .env.local and configure your own isolated Supabase URL and public publishable/anon key. Browser VITE_ values are public: never use service_role or secret keys. No author project or account is required.

## Database and authentication

The 11 files in supabase/migrations must retain their order and bytes. Follow the ordered CLI procedure and success checks in [Quickstart](docs/QUICKSTART.md#initialize-your-own-empty-database). Create your own empty Supabase project; approve its target and any cost before migration. Configure email/password Auth, site URL and allowed redirects. Never replay initialization against an existing production database.

The 11 unchanged migrations and 6/6 minimum real-cloud acceptance groups passed against a new isolated Supabase project: real password Auth, ordinary-user JWTs, PostgREST, persistence and key RLS paths. RLS coverage is targeted, not exhaustive. Full local Supabase-stack acceptance remains pending.

After configuring a suitable isolated environment, npm run dev starts the frontend. The ordinary app does not require MCP or OAuth authorization. Optional MCP endpoints need a separately configured server environment; Vite alone does not serve them.

## Optional example

Weekly training frequency and distinct Session count are independent: four workouts per week can rotate A/B/A/B. Completion order drives rotation, not a fixed weekday calendar. Users may import their own plan without adopting the four-session example. The example is optional, saved only on request, and is not personal training history or a prescription for every user. Customize src/training-playbook.ts or import JSON while preserving validators, execution identities and historical snapshots.

## Verification

A clean dependency install with npm ci (no reused node_modules or dependency symlink) passed on macOS Apple Silicon, Node 26.7.0/npm 11.19.0. npm 11 left unapproved lifecycle scripts blocked; installed platform packages still supported 61/61 offline tests, types, lint, build and public example validation. Other OS/Node combinations still need validation. SQL tests are not part of the default npm test. Browser fixture checks do not establish full integration acceptance. Strict tutorial coverage remains incomplete and intentionally fails with 115 gaps:

```sh
npm run validate:program
node --import ./tests/offline-register.mjs scripts/audit-tutorial-coverage.ts --require-complete
```

## License and third-party rights

FORM original code and original documentation, tests and examples that the owner has authority to license use the MIT License; see LICENSE. Third-party software follows its own licenses; see THIRD_PARTY_NOTICES.md.

Tutorial links lead to third-party websites. FORM does not own or bundle their tutorial images, videos or page bodies, and does not grant MIT rights to them. Short matching descriptions are not third-party authorization. No confirmed sponsorship or endorsement relationship exists between FORM and tutorial providers.

Source exports exclude private environment files, internal research, dependencies, generated artifacts and inherited media. Remaining content-rights review and the owner’s final acceptance of MIT commercial-use/modification/redistribution permissions are publication gates; this candidate is not yet approved for publication.

## Customize FORM with AI / 使用 AI 个性化 FORM

For users who want their own training workflow, Codex/Cursor can help inspect and customize FORM. Ask the agent to read [AGENTS.md](AGENTS.md) and [AI_START_HERE](docs/AI_START_HERE.md) first, then choose a [recipe](docs/CUSTOMIZATION_RECIPES.md) through the [capability map](docs/CUSTOMIZATION_MAP.md). See [Quickstart](docs/QUICKSTART.md) for verification boundaries.

先让 AI 理解需求并提出已有能力、最小方案、限制和测试，经你确认后再生成导入 JSON 或修改代码；实际导入、覆盖或保存仍需确认。优先使用计划导入和编辑，不将未来开发冒充内置配置。使用独立数据库，避免影响已有真实数据；数据库、安装和部署操作需单独授权。最小真实云端验收 6/6 通过；完整本地 Supabase 栈尚未验收，不是一键部署。

## Save recovery and search

Workout inputs use a durable per-set browser draft and version-checked saves. Retry reconciles ambiguous responses; conflicting values require your confirmation instead of silently overwriting cloud data. Legacy drafts remain readable and may require manual review. See [save recovery and local privacy](docs/QUICKSTART.md#save-recovery-and-local-privacy).

Search supports normalized case/width/punctuation, multiple terms, equipment aliases and exact exercise/execution IDs. Existing category, warm-up and replacement restrictions still apply; this is not a global equipment whitelist.
