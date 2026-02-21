import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client';
import { errorResult, textResult, withResult } from './utils';

export function registerConversationTools(server: McpServer, api: ApiClient) {
  server.tool(
    'conversations.list',
    'List all conversations (DMs, group chats, project chats).',
    {},
    async () => withResult(async () => {
      const conversations = await api.listConversations();
      return conversations.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        createdBy: c.createdBy,
        participantIds: c.participantIds,
        messageCount: c.messageCount,
        lastMessageAt: c.lastMessageAt,
      }));
    }),
  );

  server.tool(
    'conversations.get',
    'Get a conversation by ID with its full message history.',
    { id: z.string().describe('Conversation ID') },
    async ({ id }) => withResult(() => api.getConversation(id)),
  );

  server.tool(
    'conversations.create',
    'Create a new conversation. For DMs pass 1 participant (agent ID). For group chats pass 2+ participants.',
    {
      participantIds: z.array(z.string()).describe('Member IDs to include (1 = DM, 2+ = group)'),
      title: z.string().optional().describe('Optional title (group chats only)'),
    },
    async ({ participantIds, title }) => withResult(async () => {
      const result = await api.createConversation({ participantIds, title });
      return {
        conversationId: result.conversation.id,
        created: result.created,
        type: result.conversation.type,
        title: result.conversation.title,
      };
    }),
  );

  server.tool(
    'conversations.rename',
    'Rename a group chat conversation. Only group chats can be renamed.',
    {
      id: z.string().describe('Conversation ID'),
      title: z.string().describe('New conversation title'),
    },
    async ({ id, title }) => {
      try {
        const conversation = await api.renameConversation(id, title);
        return textResult(`Conversation renamed to "${conversation.title}" (${conversation.id})`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'conversations.send_message',
    'Send a message in a conversation. If the conversation has an agent, the agent will respond via its LLM (may take up to 2 minutes).',
    {
      conversationId: z.string().describe('Conversation ID'),
      content: z.string().describe('Message text (supports markdown)'),
      references: z
        .array(
          z.object({
            type: z.enum(['agent', 'issue', 'project', 'task', 'file']),
            id: z.string(),
            display: z.string(),
          }),
        )
        .default([])
        .describe('Optional entity references in the message'),
    },
    async ({ conversationId, content, references }) => {
      try {
        const message = await api.sendMessage(conversationId, content, references);
        return textResult(`Message sent (id: ${message.id}). Content: ${message.content.slice(0, 200)}${message.content.length > 200 ? '...' : ''}`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
