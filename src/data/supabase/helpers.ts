import type { SupabaseClient } from "@supabase/supabase-js";
const userChecks = new WeakMap<SupabaseClient, Promise<string>>();

export async function requireUserId(client: SupabaseClient) {
  const existing = userChecks.get(client);
  if (existing) return existing;
  const check = (async () => {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error("Authentication required.");
    return data.user.id;
  })();
  userChecks.set(client, check);
  try { return await check; } finally { if (userChecks.get(client) === check) userChecks.delete(client); }
}

export function valueOrUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}
