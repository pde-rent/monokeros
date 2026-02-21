import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client';

export function registerProjectResources(server: McpServer, api: ApiClient) {
  server.resource(
    'projects-list',
    'monokeros://projects',
    { description: 'All projects as JSON', mimeType: 'application/json' },
    async (uri) => {
      const projects = await api.listProjects();
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(projects, null, 2) }],
      };
    },
  );

  server.resource(
    'project-detail',
    new ResourceTemplate('monokeros://projects/{projectId}', {
      list: async () => {
        const projects = await api.listProjects();
        return {
          resources: projects.map((p) => ({
            uri: `monokeros://projects/${p.id}`,
            name: `${p.name} (${p.status})`,
          })),
        };
      },
    }),
    { description: 'Project details with SDLC gates as JSON', mimeType: 'application/json' },
    async (uri, { projectId }) => {
      const project = await api.getProject(projectId as string);
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(project, null, 2) }],
      };
    },
  );
}
