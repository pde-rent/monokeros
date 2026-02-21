import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client';
import { z } from 'zod';

export function registerKnowledgeTools(server: McpServer, api: ApiClient) {
  server.tool(
    'knowledge_search',
    'Search across all accessible KNOWLEDGE directories for reference material. Returns matching files with snippets and relevance scores.',
    {
      query: z.string().describe('The search terms to look for in knowledge files'),
      memberId: z.string().describe('The member ID whose scope determines which knowledge dirs are searched'),
      scopes: z.string().optional().describe('Comma-separated scope filter (workspace,team,project,personal)'),
      maxResults: z.number().optional().describe('Maximum number of results to return'),
    },
    async ({ query, memberId, scopes, maxResults }) => {
      const results = await api.searchKnowledge(query, memberId, scopes, maxResults);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
