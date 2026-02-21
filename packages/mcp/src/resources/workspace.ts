import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client';

export function registerWorkspaceResources(server: McpServer, api: ApiClient) {
  server.resource(
    'workspace',
    'monokeros://workspace',
    { description: 'Workspace configuration as JSON', mimeType: 'application/json' },
    async (uri) => {
      const workspace = await api.getWorkspace();
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(workspace, null, 2) }],
      };
    },
  );
}
