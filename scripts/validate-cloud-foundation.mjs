import { readFile } from "node:fs/promises";

const migrationUrl = new URL("../supabase/migrations/20260902000100_training_hub_cloud_foundation.sql", import.meta.url);
const rlsTestUrl = new URL("../supabase/tests/training_hub_rls.sql", import.meta.url);
const sourceUrls = [
  new URL("../src/data/supabase/client.ts", import.meta.url),
  new URL("../src/data/migration/local-v1-migration.ts", import.meta.url),
];
const migration = await readFile(migrationUrl, "utf8");
const rlsTest = await readFile(rlsTestUrl, "utf8");
const sources = await Promise.all(sourceUrls.map(url => readFile(url, "utf8")));
const tables = ["training_plans", "session_templates", "training_intents", "training_intent_options", "workout_runs", "workout_exercises", "workout_sets", "migration_imports"];

for (const table of tables) {
  if (!migration.includes(`create table public.${table}`)) throw new Error(`Missing table: ${table}`);
  if (!migration.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS is not enabled: ${table}`);
}
for (const protectedTable of ["training_plans", "workout_runs", "workout_sets"]) {
  if (!rlsTest.includes(`public.${protectedTable}`)) throw new Error(`RLS test does not cover: ${protectedTable}`);
}
if (sources.some(source => /(?:import\.meta\.env|process\.env)[\s\S]{0,80}SERVICE_ROLE/i.test(source))) throw new Error("Frontend source references a service-role credential.");
if (sources[1].includes("removeItem")) throw new Error("Phase 1 migration code must not delete legacy localStorage.");

console.log(`Cloud foundation validated: ${tables.length} tables, RLS enabled, isolation checks present, legacy data remains read-only.`);
