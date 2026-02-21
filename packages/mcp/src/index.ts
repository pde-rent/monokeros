#!/usr/bin/env bun
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ApiClient } from './api-client';

// Tools
import { registerMemberTools } from './tools/members';
import { registerTeamTools } from './tools/teams';
import { registerProjectTools } from './tools/projects';
import { registerTaskTools } from './tools/tasks';
import { registerConversationTools } from './tools/conversations';
import { registerFileTools } from './tools/files';
import { registerAgentTools } from './tools/agents';
import { registerWorkspaceTools } from './tools/workspace';
import { registerKnowledgeTools } from './tools/knowledge';

// Resources
import { registerMemberResources } from './resources/members';
import { registerTeamResources } from './resources/teams';
import { registerProjectResources } from './resources/projects';
import { registerWorkspaceResources } from './resources/workspace';

const server = new McpServer({
  name: 'monokeros',
  version: '0.0.1',
});

const api = new ApiClient();

// Read API key from environment
const apiKey = process.env.MONOKEROS_API_KEY ?? process.env.MK_API_KEY;
if (apiKey) {
  api.setApiKey(apiKey);
}

// Read workspace slug from environment
const workspace = process.env.MONOKEROS_WORKSPACE ?? process.env.MK_WORKSPACE;
if (workspace) {
  api.setWorkspace(workspace);
}

// Register tools
registerMemberTools(server, api);
registerTeamTools(server, api);
registerProjectTools(server, api);
registerTaskTools(server, api);
registerConversationTools(server, api);
registerFileTools(server, api);
registerAgentTools(server, api);
registerWorkspaceTools(server, api);
registerKnowledgeTools(server, api);

// Register resources
registerMemberResources(server, api);
registerTeamResources(server, api);
registerProjectResources(server, api);
registerWorkspaceResources(server, api);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});
