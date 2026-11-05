import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import type { PlanRepository } from "../data/repositories";
import { getMyCurrentPlan } from "./current-plan";

export function createFormMcpServer(repository: Pick<PlanRepository, "getActivePlan">) {
  const server = new McpServer({ name: "FORM", version: "0.1.0" });
  server.registerTool("get_my_current_plan", {
    title: "Get my current FORM plan",
    description: "Read the currently active, executable training plan for the authenticated FORM account.",
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => {
    const result = await getMyCurrentPlan(repository);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  });
  return server;
}
