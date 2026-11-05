import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class BridgeAuthError extends Error {
  readonly status = 401;
}

export function readBearerToken(value: string | string[] | undefined): string {
  const header = Array.isArray(value) ? value[0] : value;
  const match = header?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) throw new BridgeAuthError("A valid FORM OAuth bearer token is required.");
  return match[1];
}

export function createUserScopedClient(url: string, publishableKey: string, accessToken: string): SupabaseClient {
  if (!url || !publishableKey) throw new Error("FORM MCP Supabase configuration is incomplete.");
  rejectPrivilegedKey(publishableKey);
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function authenticateUserScopedClient(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new BridgeAuthError("The FORM OAuth token is invalid, expired, or revoked.");
  return data.user.id;
}

function rejectPrivilegedKey(key: string) {
  if (key.startsWith("sb_secret_")) throw new Error("FORM MCP refuses a Supabase secret key.");
  if (!key.startsWith("eyJ")) return;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")) as { role?: string };
    if (payload.role === "service_role") throw new Error("FORM MCP refuses a Supabase service-role key.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("refuses")) throw error;
  }
}
