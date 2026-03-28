import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../api-client";

export function registerMemberResources(server: McpServer, api: ApiClient) {
  server.resource(
    "members-list",
    "monokeros://members",
    { description: "All workspace members as JSON", mimeType: "application/json" },
    async (uri) => {
      const members = await api.listMembers();
      const safe = members.map(({ passwordHash: _, ...m }) => m);
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(safe, null, 2) }],
      };
    },
  );

  server.resource(
    "member-detail",
    new ResourceTemplate("monokeros://members/{memberId}", {
      list: async () => {
        const members = await api.listMembers();
        return {
          resources: members.map((m) => ({
            uri: `monokeros://members/${m.id}`,
            name: `${m.name} (${m.title})`,
          })),
        };
      },
    }),
    { description: "Single member details as JSON", mimeType: "application/json" },
    async (uri, { memberId }) => {
      const member = await api.getMember(memberId as string);
      const { passwordHash: _, ...safe } = member;
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(safe, null, 2) }],
      };
    },
  );
}
