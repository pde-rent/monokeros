import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client';
import { withResult } from './utils';

export function registerAgentTools(server: McpServer, api: ApiClient) {
  server.tool(
    'agents.get_runtime',
    'Get ZeroClaw agent daemon runtime status (port, PID, status, last health check).',
    { id: z.string().describe('Agent member ID') },
    async ({ id }) => withResult(() => api.getMemberRuntime(id)),
  );

  server.tool(
    'agents.list_runtimes',
    'List runtime status for all ZeroClaw agent daemons.',
    {},
    async () => withResult(() => api.listAgentRuntimes()),
  );
}
