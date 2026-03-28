import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../api-client";
import { tryAction, withResult } from "./utils";

export function registerTemplateTools(server: McpServer, api: ApiClient) {
  server.tool(
    "templates.list",
    "List all available workspace templates. Templates provide pre-configured teams and agents.",
    {},
    async () => withResult(() => api.listTemplates()),
  );

  server.tool(
    "templates.get",
    "Get details for a specific template by ID.",
    { id: z.string().describe("Template ID") },
    async ({ id }) => withResult(() => api.getTemplate(id)),
  );

  server.tool(
    "templates.apply",
    "Apply a template to create a new workspace with pre-configured teams and agents.",
    {
      templateId: z.string().describe("Template ID to apply"),
      workspaceName: z.string().describe("Internal workspace name"),
      slug: z.string().describe("URL-safe slug (unique)"),
      displayName: z.string().describe("Display name"),
    },
    async (params) =>
      tryAction(
        () => api.applyTemplate(params),
        (r) => `Workspace created from template: ${r.slug} (id: ${r.workspaceId})`,
      ),
  );
}
