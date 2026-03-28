import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AiProvider, MemberStatus } from "@monokeros/types";
import type { ApiClient } from "../api-client";
import { enumValues, tryAction, withResult } from "./utils";

export function registerMemberTools(server: McpServer, api: ApiClient) {
  server.tool(
    "members.list",
    "List all workspace members (agents and humans). Returns name, role, team, status, and specialization for each member.",
    { teamId: z.string().optional().describe("Filter by team ID") },
    async ({ teamId }) =>
      withResult(async () => {
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
    "members.get",
    "Get full details for a specific member by ID, including identity (soul, skills, memory) and stats.",
    { id: z.string().describe("Member ID") },
    async ({ id }) =>
      withResult(async () => {
        const member = await api.getMember(id);
        const { passwordHash: _, ...safe } = member;
        return safe;
      }),
  );

  server.tool(
    "members.create",
    "Create a new agent member in the workspace. Requires name, title, specialization, teamId, and identity (soul + skills). Optionally set model config to override workspace default AI provider.",
    {
      name: z.string().describe("Agent display name"),
      title: z.string().describe('Job title (e.g. "Frontend Engineer")'),
      specialization: z.string().describe("Area of expertise"),
      teamId: z.string().describe("Team to assign the member to"),
      isLead: z.boolean().default(false).describe("Whether this member is the team lead"),
      soul: z.string().describe("Agent personality/philosophy text"),
      skills: z.array(z.string()).describe("List of skill strings"),
      memory: z.array(z.string()).default([]).describe("Initial memory entries"),
      modelConfig: z
        .object({
          providerId: z.enum(enumValues(AiProvider)).optional().describe("AI provider to use"),
          model: z.string().optional().describe("Model name override"),
          apiKeyOverride: z
            .string()
            .optional()
            .describe("Agent-specific API key for token tracking"),
          temperature: z.number().min(0).max(2).optional().describe("Temperature (0-2)"),
          maxTokens: z.number().positive().optional().describe("Max output tokens"),
        })
        .nullable()
        .optional()
        .describe("Model configuration (null = use workspace default)"),
    },
    async ({ name, title, specialization, teamId, isLead, soul, skills, memory, modelConfig }) =>
      withResult(() =>
        api.createMember({
          name,
          title,
          specialization,
          teamId,
          isLead,
          identity: { soul, skills, memory },
          modelConfig: modelConfig ?? undefined,
        }),
      ),
  );

  server.tool(
    "members.update",
    "Update an existing member. Can change name, title, specialization, identity, model config, etc. Changing model config restarts the agent daemon.",
    {
      id: z.string().describe("Member ID to update"),
      name: z.string().optional().describe("New display name"),
      title: z.string().optional().describe("New job title"),
      specialization: z.string().optional().describe("New area of expertise"),
      teamId: z.string().optional().describe("New team assignment"),
      isLead: z.boolean().optional().describe("Team lead status"),
      modelConfig: z
        .object({
          providerId: z.enum(enumValues(AiProvider)).optional().describe("AI provider to use"),
          model: z.string().optional().describe("Model name override"),
          apiKeyOverride: z.string().optional().describe("Agent-specific API key"),
          temperature: z.number().min(0).max(2).optional().describe("Temperature (0-2)"),
          maxTokens: z.number().positive().optional().describe("Max output tokens"),
        })
        .nullable()
        .optional()
        .describe("Model configuration (null = use workspace default)"),
    },
    async ({ id, ...updates }) =>
      tryAction(
        () => api.updateMember(id, updates),
        (m) => `Updated ${m.name} (${m.id})`,
      ),
  );

  server.tool(
    "members.update_status",
    "Update a member's status and optionally set current task/project context. Valid statuses: idle, working, reviewing, blocked, offline.",
    {
      id: z.string().describe("Member ID"),
      status: z.enum(enumValues(MemberStatus)).describe("New status"),
      currentTaskId: z.string().nullable().optional().describe("Current task ID (null to clear)"),
      currentProjectId: z.string().nullable().optional().describe("Current project ID (null to clear)"),
    },
    async ({ id, status, currentTaskId, currentProjectId }) =>
      tryAction(
        () => api.updateMemberStatus(id, status, {
          ...(currentTaskId !== undefined && { currentTaskId }),
          ...(currentProjectId !== undefined && { currentProjectId }),
        }),
        (m) => `Status updated to "${status}" for ${m.name}`,
      ),
  );

  server.tool(
    "members.start_agent",
    'Start an OpenClaw agent daemon. The agent must be of type "agent". Returns runtime info including port and PID.',
    { id: z.string().describe("Agent member ID") },
    async ({ id }) => withResult(() => api.startAgent(id)),
  );

  server.tool(
    "members.stop_agent",
    "Stop a running OpenClaw agent daemon. Sends SIGTERM then SIGKILL after grace period.",
    { id: z.string().describe("Agent member ID") },
    async ({ id }) =>
      tryAction(
        () => api.stopAgent(id),
        (r) => (r.success ? `Agent ${id} stopped.` : `Failed to stop agent ${id}.`),
      ),
  );

  server.tool(
    "members.reroll_name",
    "Generate a new random human first name for an agent. Keeps current gender and avatar unchanged.",
    { id: z.string().describe("Agent member ID") },
    async ({ id }) => withResult(() => api.rerollMemberName(id)),
  );

  server.tool(
    "members.reroll_identity",
    "Generate a new random identity (name, gender, and avatar) for an agent. Use this when you want a completely new persona.",
    { id: z.string().describe("Agent member ID") },
    async ({ id }) => withResult(() => api.rerollMemberIdentity(id)),
  );

  server.tool(
    "members.remove",
    "Remove a member from the workspace. This permanently deletes the member and stops any running agent container.",
    { id: z.string().describe("Member ID to remove") },
    async ({ id }) =>
      tryAction(
        () => api.deleteMember(id),
        (r) => (r.success ? `Member ${id} removed.` : `Failed to remove member ${id}.`),
      ),
  );

  server.tool(
    "members.restart_agent",
    "Restart an agent's container with fresh provisioning data. Use after changing model config or identity.",
    { id: z.string().describe("Agent member ID") },
    async ({ id }) => withResult(() => api.restartAgent(id)),
  );

  server.tool(
    "members.get_desktop",
    "Get VNC desktop info for an agent (port, status). Returns null if no desktop is available.",
    { id: z.string().describe("Agent member ID") },
    async ({ id }) => withResult(() => api.getAgentDesktop(id)),
  );

  server.tool(
    "members.get_stats",
    "Get live container stats (CPU, memory, windows) for a running agent.",
    { id: z.string().describe("Agent member ID") },
    async ({ id }) => withResult(() => api.getAgentStats(id)),
  );

  server.tool(
    "members.create_desktop_session",
    "Create a VNC desktop session for an agent. Admins can request interactive (control) access.",
    {
      id: z.string().describe("Agent member ID"),
      interactive: z.boolean().optional().describe("Request interactive control (admin only)"),
    },
    async ({ id, interactive }) => withResult(() => api.createDesktopSession(id, interactive)),
  );
}
