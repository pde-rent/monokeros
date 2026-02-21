import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AiProvider, MemberStatus } from '@monokeros/types';
import type { ApiClient } from '../api-client';
import { enumValues, errorResult, textResult, withResult } from './utils';

export function registerMemberTools(server: McpServer, api: ApiClient) {
  server.tool(
    'members.list',
    'List all workspace members (agents and humans). Returns name, role, team, status, and specialization for each member.',
    { teamId: z.string().optional().describe('Filter by team ID') },
    async ({ teamId }) => withResult(async () => {
      const members = await api.listMembers();
      const filtered = teamId ? members.filter((m) => m.teamId === teamId) : members;
      return filtered.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        title: m.title,
        specialization: m.specialization,
        teamId: m.teamId,
        status: m.status,
        isLead: m.isLead,
      }));
    }),
  );

  server.tool(
    'members.get',
    'Get full details for a specific member by ID, including identity (soul, skills, memory) and stats.',
    { id: z.string().describe('Member ID') },
    async ({ id }) => withResult(async () => {
      const member = await api.getMember(id);
      const { passwordHash: _, ...safe } = member;
      return safe;
    }),
  );

  server.tool(
    'members.create',
    'Create a new agent member in the workspace. Requires name, title, specialization, teamId, and identity (soul + skills). Optionally set model config to override workspace default AI provider.',
    {
      name: z.string().describe('Agent display name'),
      title: z.string().describe('Job title (e.g. "Frontend Engineer")'),
      specialization: z.string().describe('Area of expertise'),
      teamId: z.string().describe('Team to assign the member to'),
      isLead: z.boolean().default(false).describe('Whether this member is the team lead'),
      soul: z.string().describe('Agent personality/philosophy text'),
      skills: z.array(z.string()).describe('List of skill strings'),
      memory: z.array(z.string()).default([]).describe('Initial memory entries'),
      modelConfig: z.object({
        providerId: z.enum(enumValues(AiProvider)).optional().describe('AI provider to use'),
        model: z.string().optional().describe('Model name override'),
        apiKeyOverride: z.string().optional().describe('Agent-specific API key for token tracking'),
        temperature: z.number().min(0).max(2).optional().describe('Temperature (0-2)'),
        maxTokens: z.number().positive().optional().describe('Max output tokens'),
      }).nullable().optional().describe('Model configuration (null = use workspace default)'),
    },
    async ({ name, title, specialization, teamId, isLead, soul, skills, memory, modelConfig }) =>
      withResult(() => api.createMember({
        name, title, specialization, teamId, isLead,
        identity: { soul, skills, memory },
        modelConfig: modelConfig ?? undefined,
      })),
  );

  server.tool(
    'members.update',
    'Update an existing member. Can change name, title, specialization, identity, model config, etc. Changing model config restarts the agent daemon.',
    {
      id: z.string().describe('Member ID to update'),
      name: z.string().optional().describe('New display name'),
      title: z.string().optional().describe('New job title'),
      specialization: z.string().optional().describe('New area of expertise'),
      teamId: z.string().optional().describe('New team assignment'),
      isLead: z.boolean().optional().describe('Team lead status'),
      modelConfig: z.object({
        providerId: z.enum(enumValues(AiProvider)).optional().describe('AI provider to use'),
        model: z.string().optional().describe('Model name override'),
        apiKeyOverride: z.string().optional().describe('Agent-specific API key'),
        temperature: z.number().min(0).max(2).optional().describe('Temperature (0-2)'),
        maxTokens: z.number().positive().optional().describe('Max output tokens'),
      }).nullable().optional().describe('Model configuration (null = use workspace default)'),
    },
    async ({ id, ...updates }) => {
      try {
        const member = await api.updateMember(id, updates);
        return textResult(`Updated ${member.name} (${member.id})`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'members.update_status',
    'Update a member\'s status. Valid statuses: idle, working, reviewing, blocked, offline.',
    {
      id: z.string().describe('Member ID'),
      status: z.enum(enumValues(MemberStatus)).describe('New status'),
    },
    async ({ id, status }) => {
      try {
        const member = await api.updateMemberStatus(id, status);
        return textResult(`Status updated to "${status}" for ${member.name}`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'members.start_agent',
    'Start a ZeroClaw agent daemon. The agent must be of type "agent". Returns runtime info including port and PID.',
    { id: z.string().describe('Agent member ID') },
    async ({ id }) => withResult(() => api.startAgent(id)),
  );

  server.tool(
    'members.stop_agent',
    'Stop a running ZeroClaw agent daemon. Sends SIGTERM then SIGKILL after grace period.',
    { id: z.string().describe('Agent member ID') },
    async ({ id }) => {
      try {
        const result = await api.stopAgent(id);
        return textResult(result.success ? `Agent ${id} stopped.` : `Failed to stop agent ${id}.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'members.reroll_name',
    'Generate a new random human first name for an agent. Keeps current gender and avatar unchanged.',
    { id: z.string().describe('Agent member ID') },
    async ({ id }) => withResult(() => api.rerollMemberName(id)),
  );

  server.tool(
    'members.reroll_identity',
    'Generate a new random identity (name, gender, and avatar) for an agent. Use this when you want a completely new persona.',
    { id: z.string().describe('Agent member ID') },
    async ({ id }) => withResult(() => api.rerollMemberIdentity(id)),
  );
}
