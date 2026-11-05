import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SupabasePlanRepository } from "../src/data/supabase/plan-repository";
import { authenticateUserScopedClient, BridgeAuthError, createUserScopedClient, readBearerToken } from "../src/ai-bridge/auth";
import { createFormMcpServer } from "../src/ai-bridge/mcp-server";

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  const origin = publicOrigin(req);
  try {
    if (req.method !== "POST") return methodNotAllowed(res);
    const token = readBearerToken(req.headers.authorization);
    const client = createUserScopedClient(requiredEnv("SUPABASE_URL", "VITE_SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"), token);
    await authenticateUserScopedClient(client);
    const server = createFormMcpServer(new SupabasePlanRepository(client));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (error instanceof BridgeAuthError) {
      res.statusCode = 401;
      res.setHeader("WWW-Authenticate", `Bearer resource_metadata=\"${origin}/.well-known/oauth-protected-resource\"`);
      return json(res, { error: "unauthorized", error_description: error.message });
    }
    console.error("FORM MCP request failed", error);
    res.statusCode = 500;
    return json(res, { error: "server_error", error_description: "FORM MCP could not complete the request." });
  }
}

function requiredEnv(...names: string[]) {
  for (const name of names) if (process.env[name]) return process.env[name]!;
  throw new Error(`Missing server environment variable: ${names.join(" or ")}`);
}
function publicOrigin(req: IncomingMessage) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  return `${Array.isArray(proto) ? proto[0] : proto}://${Array.isArray(host) ? host[0] : host}`;
}
function methodNotAllowed(res: ServerResponse) { res.statusCode = 405; res.setHeader("Allow", "POST"); return json(res, { error: "method_not_allowed" }); }
function json(res: ServerResponse, body: unknown) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); }
