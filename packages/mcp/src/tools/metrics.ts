import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../api-client";
import { withResult } from "./utils";

export function registerMetricTools(server: McpServer, api: ApiClient) {
  server.tool(
    "metrics.token_usage_by_member",
    "Get token usage history for a specific agent/member. Shows prompt tokens, completion tokens, cost, and model used.",
    {
      memberId: z.string().describe("Member ID"),
      limit: z.number().optional().describe("Max records to return (default: all)"),
    },
    async ({ memberId, limit }) => withResult(() => api.getMemberTokenUsage(memberId, limit)),
  );

  server.tool(
    "metrics.token_usage_by_conversation",
    "Get token usage history for a specific conversation.",
    {
      conversationId: z.string().describe("Conversation ID"),
      limit: z.number().optional().describe("Max records to return (default: all)"),
    },
    async ({ conversationId, limit }) =>
      withResult(() => api.getConversationTokenUsage(conversationId, limit)),
  );

  server.tool(
    "metrics.resource_snapshots",
    "Get resource usage snapshots (CPU, memory, window count) for a running agent.",
    {
      memberId: z.string().describe("Member ID"),
      limit: z.number().optional().describe("Max records to return (default: all)"),
    },
    async ({ memberId, limit }) =>
      withResult(() => api.getMemberResourceSnapshots(memberId, limit)),
  );
}
