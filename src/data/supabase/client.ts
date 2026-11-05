import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

function rejectServiceRoleKey(key: string) {
  if (key.startsWith("sb_secret_")) throw new Error("Refusing to expose a Supabase secret key in the browser.");
  if (!key.startsWith("eyJ")) return;
  try {
    const segment = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, "="))) as { role?: string };
    if (payload.role === "service_role") throw new Error("Refusing to expose a Supabase service-role key in the browser.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("service-role")) throw error;
  }
}

export function hasSupabaseConfig() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function getSupabaseClient() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  rejectServiceRoleKey(anonKey);
  client = createClient(url, anonKey, {
    global: { headers: { 'x-form-catalog-capability': 'e53-firstwave-rebuild-v1' } },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
