import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AiProvider } from '@monokeros/types';
import type { ApiClient } from '../api-client';
import { enumValues, errorResult, textResult, withResult } from './utils';

export function registerWorkspaceTools(server: McpServer, api: ApiClient) {
  server.tool(
    'workspace.get',
    'Get the workspace configuration (name, industry, branding, status, providers).',
    {},
    async () => withResult(() => api.getWorkspace()),
  );

  server.tool(
    'workspace.update',
    'Update workspace configuration fields (displayName, industry, branding, status).',
    {
      displayName: z.string().optional().describe('Workspace display name'),
      industry: z.string().optional().describe('Industry enum value'),
      industrySubtype: z.string().nullable().optional().describe('Industry subtype'),
      branding: z
        .object({
          logo: z.string().nullable().optional(),
          color: z.string().optional(),
        })
        .optional()
        .describe('Branding overrides'),
      status: z.enum(['active', 'paused', 'archived']).optional().describe('Workspace status'),
    },
    async (params) => {
      try {
        const filtered = Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined),
        );
        const workspace = await api.updateWorkspace(filtered);
        return textResult(`Workspace updated: ${workspace.displayName} (${workspace.status})`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'workspace.list_providers',
    'List all configured AI providers for the workspace. API keys are masked.',
    {},
    async () => withResult(() => api.getWorkspaceProviders()),
  );

  server.tool(
    'workspace.add_provider',
    'Add or replace an AI provider configuration for the workspace.',
    {
      provider: z.enum(enumValues(AiProvider)).describe('Provider identifier (e.g. openai, anthropic, zai)'),
      baseUrl: z.string().url().describe('API base URL'),
      apiKey: z.string().describe('API key'),
      defaultModel: z.string().describe('Default model name'),
      label: z.string().optional().describe('Display label (e.g. "Production OpenAI")'),
    },
    async (params) => {
      try {
        await api.addWorkspaceProvider(params);
        return textResult(`Provider ${params.provider} added to workspace.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'workspace.remove_provider',
    'Remove an AI provider from the workspace.',
    {
      provider: z.enum(enumValues(AiProvider)).describe('Provider to remove'),
    },
    async ({ provider }) => {
      try {
        await api.removeWorkspaceProvider(provider);
        return textResult(`Provider ${provider} removed.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'workspace.set_default_provider',
    'Set the default AI provider for all agents in the workspace.',
    {
      provider: z.enum(enumValues(AiProvider)).describe('Provider to set as default'),
    },
    async ({ provider }) => {
      try {
        await api.setDefaultProvider(provider);
        return textResult(`Default provider set to ${provider}.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
