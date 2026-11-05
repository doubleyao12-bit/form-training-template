import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    return res.end();
  }
  const proto = first(req.headers["x-forwarded-proto"]) ?? "https";
  const host = first(req.headers["x-forwarded-host"]) ?? req.headers.host;
  const origin = `${proto}://${host}`;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.end(JSON.stringify({
    resource: `${origin}/mcp`,
    authorization_servers: [`${requiredEnv("SUPABASE_URL", "VITE_SUPABASE_URL")}/auth/v1`],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "offline_access"],
  }));
}

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function requiredEnv(...names: string[]) {
  for (const name of names) if (process.env[name]) return process.env[name]!;
  throw new Error(`Missing server environment variable: ${names.join(" or ")}`);
}
