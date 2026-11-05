import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { TrainingPlanAggregate } from "../src/domain/training";
import { createFormMcpServer } from "../src/ai-bridge/mcp-server";
import { CURRENT_PLAN_CONTRACT_VERSION, getMyCurrentPlan, serializeCurrentPlan } from "../src/ai-bridge/current-plan";
import { BridgeAuthError, createUserScopedClient, readBearerToken } from "../src/ai-bridge/auth";

const now = "2026-09-22T00:00:00.000Z";
function plan(id: string, userId: string): TrainingPlanAggregate {
  return {
    id, userId, name: `Plan ${id}`, status: "active", goalSummary: "Build strength", cycleName: "Cycle 1",
    createdAt: now, updatedAt: now, sessions: [{
      id: `session-${id}`, userId, planId: id, name: "A", order: 1, purpose: "Squat strength", createdAt: now, updatedAt: now,
      intents: [{
        id: `intent-${id}`, userId, sessionTemplateId: `session-${id}`, label: "Squat", order: 1,
        defaultVariationId: "back-squat--barbell", explicitOptionIds: [],
        prescription: { sets: 3, targetReps: 5, targetLoad: 80 }, createdAt: now, updatedAt: now,
      }],
    }],
  };
}

test("bearer parsing fails closed for missing and malformed credentials", () => {
  for (const value of [undefined, "", "Basic abc", "Bearer", "Bearer a b"]) assert.throws(() => readBearerToken(value), BridgeAuthError);
  assert.equal(readBearerToken("Bearer valid-token"), "valid-token");
});

test("user-scoped client refuses service-role credentials", () => {
  const encoded = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
  assert.throws(() => createUserScopedClient("https://example.supabase.co", `eyJ.${encoded}.signature`, "user-token"), /service-role/);
});

test("empty current plan is a stable domain state", async () => {
  assert.deepEqual(await getMyCurrentPlan({ getActivePlan: async () => null }), {
    contractVersion: CURRENT_PLAN_CONTRACT_VERSION, state: "no_current_plan", plan: null,
  });
});

test("serialization omits identity and preserves executable prescription", () => {
  const result = serializeCurrentPlan(plan("a", "private-user-a"));
  const json = JSON.stringify(result);
  assert.equal(json.includes("private-user-a"), false);
  assert.equal(json.includes("userId"), false);
  assert.equal(result.sessions[0].intents[0].prescription?.targetReps, 5);
  assert.equal(result.sessions[0].intents[0].exercise.variationId, "back-squat--barbell");
});

test("same MCP client receives the plan selected only by the authenticated repository context", async () => {
  for (const [id, user] of [["a", "user-a"], ["b", "user-b"]] as const) {
    const server = createFormMcpServer({ getActivePlan: async () => plan(id, user) });
    const client = new Client({ name: "same-chatgpt", version: "1" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport); await client.connect(clientTransport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(tool => tool.name), ["get_my_current_plan"]);
    const response = await client.callTool({ name: "get_my_current_plan", arguments: {} });
    assert.equal((response.structuredContent as { plan: { id: string } }).plan.id, id);
    await client.close(); await server.close();
  }
});

test("caller-supplied user_id is rejected by the only business tool", async () => {
  const server = createFormMcpServer({ getActivePlan: async () => plan("a", "user-a") });
  const client = new Client({ name: "malicious-client", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  const response = await client.callTool({ name: "get_my_current_plan", arguments: { user_id: "user-b" } });
  assert.equal(response.isError, true);
  await client.close(); await server.close();
});
