import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client';

export function registerTeamResources(server: McpServer, api: ApiClient) {
  server.resource(
    'teams-list',
    'monokeros://teams',
    { description: 'All teams as JSON', mimeType: 'application/json' },
    async (uri) => {
      const teams = await api.listTeams();
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(teams, null, 2) }],
      };
    },
  );

  server.resource(
    'team-detail',
    new ResourceTemplate('monokeros://teams/{teamId}', {
      list: async () => {
        const teams = await api.listTeams();
        return {
          resources: teams.map((t) => ({
            uri: `monokeros://teams/${t.id}`,
            name: t.name,
          })),
        };
      },
    }),
    { description: 'Team with members as JSON', mimeType: 'application/json' },
    async (uri, { teamId }) => {
      const team = await api.getTeam(teamId as string);
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(team, null, 2) }],
      };
    },
  );
}
