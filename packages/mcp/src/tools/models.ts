import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../api-client";
import { withResult } from "./utils";

export function registerModelTools(server: McpServer, api: ApiClient) {
  server.tool(
    "models.providers",
    "List all supported AI provider registries with their default base URLs.",
    {},
    async () => withResult(() => api.getModelProviders()),
  );

  server.tool(
    "models.catalog",
    "Search the OpenRouter model catalog. Returns up to 100 models matching the search query.",
    {
      search: z.string().optional().describe("Filter models by name or ID (optional)"),
    },
    async ({ search }) => withResult(() => api.getModelCatalog(search)),
  );
}
