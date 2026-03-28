import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AiProvider } from "@monokeros/types";
import type { ApiClient } from "../api-client";
import { enumValues, cleanUpdate, tryAction, withResult } from "./utils";

export function registerWorkspaceTools(server: McpServer, api: ApiClient) {
  server.tool(
    "workspace.get",
    "Get the workspace configuration (name, industry, branding, status, providers).",
    {},
    async () => withResult(() => api.getWorkspace()),
  );

  server.tool(
    "workspace.update",
    "Update workspace configuration fields (displayName, industry, branding, status).",
    {
      displayName: z.string().optional().describe("Workspace display name"),
      industry: z.string().optional().describe("Industry enum value"),
      industrySubtype: z.string().nullable().optional().describe("Industry subtype"),
      branding: z
        .object({
          logo: z.string().nullable().optional(),
          color: z.string().optional(),
        })
        .optional()
        .describe("Branding overrides"),
      status: z.enum(["active", "paused", "archived"]).optional().describe("Workspace status"),
    },
    async (params) =>
      tryAction(
        () => api.updateWorkspace(cleanUpdate(params)),
        (ws) => `Workspace updated: ${ws.displayName} (${ws.status})`,
      ),
  );

  server.tool(
    "workspace.list_providers",
    "List all configured AI providers for the workspace. API keys are masked.",
    {},
    async () => withResult(() => api.getWorkspaceProviders()),
  );

  server.tool(
    "workspace.add_provider",
    "Add or replace an AI provider configuration for the workspace.",
    {
      provider: z
        .enum(enumValues(AiProvider))
        .describe("Provider identifier (e.g. openai, anthropic, zai)"),
      baseUrl: z.string().url().describe("API base URL"),
      apiKey: z.string().describe("API key"),
      defaultModel: z.string().describe("Default model name"),
      label: z.string().optional().describe('Display label (e.g. "Production OpenAI")'),
    },
    async (params) =>
      tryAction(
        () => api.addWorkspaceProvider(params),
        () => `Provider ${params.provider} added to workspace.`,
      ),
  );

  server.tool(
    "workspace.update_provider",
    "Update an existing AI provider configuration (base URL, API key, default model, label).",
    {
      provider: z.enum(enumValues(AiProvider)).describe("Provider to update"),
      baseUrl: z.string().url().optional().describe("New API base URL"),
      apiKey: z.string().optional().describe("New API key"),
      defaultModel: z.string().optional().describe("New default model name"),
      label: z.string().optional().describe("New display label"),
    },
    async ({ provider, ...updates }) =>
      tryAction(
        () => api.updateWorkspaceProvider(provider, cleanUpdate(updates)),
        () => `Provider ${provider} updated.`,
      ),
  );

  server.tool(
    "workspace.remove_provider",
    "Remove an AI provider from the workspace.",
    {
      provider: z.enum(enumValues(AiProvider)).describe("Provider to remove"),
    },
    async ({ provider }) =>
      tryAction(
        () => api.removeWorkspaceProvider(provider),
        () => `Provider ${provider} removed.`,
      ),
  );

  server.tool(
    "workspace.set_default_provider",
    "Set the default AI provider for all agents in the workspace.",
    {
      provider: z.enum(enumValues(AiProvider)).describe("Provider to set as default"),
    },
    async ({ provider }) =>
      tryAction(
        () => api.setDefaultProvider(provider),
        () => `Default provider set to ${provider}.`,
      ),
  );

  server.tool(
    "workspace.create",
    "Create a new workspace with the given name, slug, industry, and optional description.",
    {
      name: z.string().describe("Internal workspace name"),
      displayName: z.string().describe("Display name"),
      slug: z.string().describe("URL-safe slug (unique)"),
      industry: z.string().describe("Industry enum value"),
      description: z.string().optional().describe("Workspace description"),
      industrySubtype: z.string().optional().describe("Industry subtype"),
    },
    async (params) =>
      tryAction(
        () => api.createWorkspace(params),
        (ws) => `Workspace created: ${ws.displayName} (${ws.slug})`,
      ),
  );

  server.tool(
    "workspace.delete",
    "Delete the current workspace. Requires confirming the workspace name for safety.",
    {
      confirmName: z.string().describe("Type the workspace name to confirm deletion"),
    },
    async ({ confirmName }) =>
      tryAction(
        () => api.deleteWorkspace(confirmName),
        () => `Workspace deleted.`,
      ),
  );
}
