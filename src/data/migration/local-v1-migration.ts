import type { HubState } from "../../training-models";

export const LEGACY_HUB_KEY = "training-hub-state-v1";
export const MIGRATION_MARKER_PREFIX = "training-hub-cloud-migration-v1";

export interface MigrationInspection {
  exists: boolean;
  fingerprint?: string;
  counts?: { goals: number; cycles: number; weeklyPlans: number; sessions: number; completedSessions: number };
  source?: HubState;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function inspectLegacyHubState(): Promise<MigrationInspection> {
  const raw = localStorage.getItem(LEGACY_HUB_KEY);
  if (!raw) return { exists: false };
  const source = JSON.parse(raw) as HubState;
  return {
    exists: true,
    fingerprint: await sha256(raw),
    counts: {
      goals: source.goals.length,
      cycles: source.cycles.length,
      weeklyPlans: source.weeklyPlans.length,
      sessions: source.sessions.length,
      completedSessions: source.sessions.filter(session => session.status === "completed").length,
    },
    source,
  };
}

export function migrationMarkerKey(userId: string) {
  return `${MIGRATION_MARKER_PREFIX}:${userId}`;
}

/** Phase 1 intentionally stops before transforming or uploading legacy data. */
export async function prepareLegacyMigration(userId: string) {
  const inspection = await inspectLegacyHubState();
  const marker = localStorage.getItem(migrationMarkerKey(userId));
  return { inspection, marker, ready: inspection.exists && !marker };
}
