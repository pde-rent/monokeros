import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../api-client";
import { withResult } from "./utils";

export function registerActivityTools(server: McpServer, api: ApiClient) {
  server.tool(
    "activities.feed",
    "Get the workspace activity feed (audit log). Shows recent actions taken by members and agents.",
    {
      limit: z.number().optional().describe("Max entries to return (default: 50)"),
    },
    async ({ limit }) => withResult(() => api.getActivityFeed(limit)),
  );
}
