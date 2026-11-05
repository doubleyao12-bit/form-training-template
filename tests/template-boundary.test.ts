import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanPage } from '../src/CloudTrainingApp';
import { examplePlaybookV01, createExampleTrainingPlan } from '../src/training-playbook';
const originalMigrations = {
  "20260902000100_training_hub_cloud_foundation.sql": "0ff8e98ee18260c8024ab85a533aa192f745a16ff4eb6cfb7d187196c96bc9c0",
  "20260908000100_training_hub_phase2_integrity.sql": "54ec72605f378aa871b9fe8391da323a9cf637d3119af5ac7aaa3ef4f284ec59",
  "20260908000200_training_intent_prescription.sql": "aa99e62733b5328ee3fa9b837babf46f3290e7a95a9c66aa86d780cc78922567",
  "20260908000300_training_playbook_plan_context.sql": "163e733cf9f35b9137dda68a1fc1c9c71299f41c9765e3e5f03dbfa14ee457f0",
  "20260908000400_workout_revert_guard.sql": "975cccf0e783d318908c6040b93ef3d04b3134dc09c94e01e4d562399260de8d",
  "20260916000100_training_hub_measurements.sql": "abd5aa13888f2248793b78c864d0da4c7e995127ee931d6ed2c776fd3465f0b0",
  "20260917000100_training_hub_execution_mutations.sql": "382d94143c18ef07a668510d9c5f0adc442497318d9c6635136845c9ed656df8",
  "20260929160328_form_plan_soft_delete_and_atomic_update.sql": "94296075c827eae672521328dda875a1c309e16a615eaafc604441dff785a74d",
  "20261016035901_form_flexible_training_v23.sql": "20ea1537d40ae529fa5065e054e542d37ef841ff61ac3b6c4de9b41a3d62c705",
  "20261026031729_form_complete_execution_catalog.sql": "63e60b99293532e5602cca1c6da647c9199c35000f8244db4d3202c233f4e156",
  "20261026031846_form_v23_execution_integration.sql": "9078b363b7721a239d6344619784c6867c74b07408daf33bd5a85bb3add307be"
};
test('the 11 released migrations retain exact names and bytes', () => {
  const directory = new URL('../supabase/migrations/', import.meta.url);
  assert.deepEqual(readdirSync(directory).filter(n => n.endsWith('.sql')).sort(), Object.keys(originalMigrations).sort());
  for (const [name, expected] of Object.entries(originalMigrations)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(name, directory))).digest('hex'), expected, name);
  }
});
test('a new user can import a plan without enrolling in the optional sample', () => {
  const html = renderToStaticMarkup(createElement(PlanPage, {plan:null, plans:[], playbook:null, activeRun:null, onCreated:async()=>{}}));
  assert.match(html, /导入方案/);
  assert.match(html, /保存可选示例计划/);
  assert.match(html, /示例不会自动写入/);
  assert.equal(createExampleTrainingPlan().sessions.length, 4);
  assert.equal(examplePlaybookV01.name, 'Example Training Playbook');
});
test('offline tests refuse network access', () => {
  assert.throws(() => globalThis.fetch('https://example.invalid/'), /Network request denied/);
});
test('entry and public manifest contain no production debug route or inherited icon assets', () => {
  const entry = readFileSync(new URL('../src/main.tsx',import.meta.url), 'utf8');
  assert.doesNotMatch(entry, /CloudPersistenceCheck|cloud-check/);
  assert.match(entry, /OAuthConsent/);
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url), 'utf8'));
  assert.deepEqual(manifest.icons, []);
});
