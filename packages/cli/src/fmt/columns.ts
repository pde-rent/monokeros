/**
 * Column definitions for all resource types.
 *
 * Each resource type defines its columns once. The Formatter class handles
 * table/wide/json/yaml/name output — column defs are the only input.
 */

import type {
  Member,
  Team,
  Project,
  Task,
  Conversation,
  AgentRuntime,
  Workspace,
  ProviderConfig,
} from "@monokeros/types";
import { colorize, type ColumnDef, type DescribeField } from "./formatter";

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(iso: string | null): string {
  if (!iso) return "-";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1_000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function truncate(s: string, max = 40): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ── Members / Agents ──────────────────────────────────────────────────────────

export const MEMBER_COLUMNS: ColumnDef<Member>[] = [
  { header: "NAME", value: (m) => m.name },
  { header: "TYPE", value: (m) => m.type },
  { header: "STATUS", value: (m) => m.status, color: (m) => colorize(m.status) },
  { header: "TITLE", value: (m) => truncate(m.title) },
  { header: "SPECIALIZATION", value: (m) => truncate(m.specialization), wide: true },
  { header: "TEAM", value: (m) => m.teamId ?? "-", wide: true },
  { header: "LEAD", value: (m) => m.isLead ? "yes" : "-", wide: true },
];

export const MEMBER_DESCRIBE: DescribeField<Member>[] = [
  { label: "Name", value: (m) => m.name },
  { label: "ID", value: (m) => m.id },
  { label: "Type", value: (m) => m.type },
  { label: "Status", value: (m) => m.status },
  { label: "Title", value: (m) => m.title },
  { label: "Specialization", value: (m) => m.specialization },
  { label: "Team ID", value: (m) => m.teamId ?? "-" },
  { label: "Lead", value: (m) => m.isLead ? "Yes" : "No" },
  { label: "System", value: (m) => m.system ? "Yes" : "No" },
  { label: "Email", value: (m) => m.email ?? undefined },
  { label: "Current Task", value: (m) => m.currentTaskId ?? "-" },
  { label: "Current Project", value: (m) => m.currentProjectId ?? "-" },
  { label: "Tasks Completed", value: (m) => String(m.stats.tasksCompleted) },
  { label: "Active Projects", value: (m) => String(m.stats.activeProjects) },
  { label: "Avg Agreement", value: (m) => m.stats.avgAgreementScore > 0 ? `${(m.stats.avgAgreementScore * 100).toFixed(0)}%` : "-" },
  { label: "Permissions", value: (m) => m.permissions && m.permissions.length > 0 ? m.permissions : undefined },
  {
    label: "Model Config",
    value: (m) => {
      if (!m.modelConfig) return "-";
      const parts: string[] = [];
      if (m.modelConfig.providerId) parts.push(`provider=${m.modelConfig.providerId}`);
      if (m.modelConfig.model) parts.push(`model=${m.modelConfig.model}`);
      if (m.modelConfig.temperature !== undefined) parts.push(`temp=${m.modelConfig.temperature}`);
      return parts.join(", ") || "-";
    },
  },
];

// ── Teams ─────────────────────────────────────────────────────────────────────

export const TEAM_COLUMNS: ColumnDef<Team>[] = [
  { header: "NAME", value: (t) => t.name },
  { header: "TYPE", value: (t) => t.type },
  { header: "LEAD", value: (t) => t.leadId },
  { header: "MEMBERS", value: (t) => String(t.memberIds.length) },
];

type TeamWithMembers = Team & { members: Member[] };

export const TEAM_DESCRIBE: DescribeField<TeamWithMembers>[] = [
  { label: "Name", value: (t) => t.name },
  { label: "ID", value: (t) => t.id },
  { label: "Type", value: (t) => t.type },
  { label: "Color", value: (t) => t.color },
  { label: "Lead", value: (t) => t.leadId },
  { label: "Members", value: (t) => t.members.map((m) => `${m.name} (${m.type}, ${m.status})`) },
];

// ── Projects ──────────────────────────────────────────────────────────────────

export const PROJECT_COLUMNS: ColumnDef<Project>[] = [
  { header: "NAME", value: (p) => p.name },
  { header: "SLUG", value: (p) => p.slug },
  { header: "STATUS", value: (p) => p.status, color: (p) => colorize(p.status) },
  { header: "PHASE", value: (p) => p.currentPhase || "-" },
  { header: "TEAMS", value: (p) => String(p.assignedTeamIds.length), wide: true },
  { header: "MEMBERS", value: (p) => String(p.assignedMemberIds.length), wide: true },
  { header: "AGE", value: (p) => ago(p.createdAt), wide: true },
];

export const PROJECT_DESCRIBE: DescribeField<Project>[] = [
  { label: "Name", value: (p) => p.name },
  { label: "Slug", value: (p) => p.slug },
  { label: "ID", value: (p) => p.id },
  { label: "Status", value: (p) => p.status },
  { label: "Description", value: (p) => p.description || "-" },
  { label: "Phase", value: (p) => p.currentPhase || "-" },
  { label: "Phases", value: (p) => p.phases.length > 0 ? p.phases : undefined },
  { label: "Types", value: (p) => p.types.length > 0 ? p.types : undefined },
  { label: "Teams", value: (p) => p.assignedTeamIds.length > 0 ? p.assignedTeamIds : undefined },
  { label: "Members", value: (p) => p.assignedMemberIds.length > 0 ? p.assignedMemberIds : undefined },
  { label: "Git Repo", value: (p) => p.gitRepo?.url ?? "-" },
  { label: "Created", value: (p) => p.createdAt },
  { label: "Modified", value: (p) => p.modifiedAt },
  {
    label: "Gates",
    value: (p) =>
      p.gates.length > 0
        ? p.gates.map((g) => `${g.phase}: ${g.status}`)
        : undefined,
  },
];

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const TASK_COLUMNS: ColumnDef<Task>[] = [
  { header: "TITLE", value: (t) => truncate(t.title, 50) },
  { header: "SLUG", value: (t) => t.slug },
  { header: "STATUS", value: (t) => t.status, color: (t) => colorize(t.status) },
  { header: "PRIORITY", value: (t) => t.priority, color: (t) => colorize(t.priority) },
  { header: "TYPE", value: (t) => t.type ?? "-", wide: true },
  { header: "ASSIGNEES", value: (t) => String(t.assigneeIds.length), wide: true },
  { header: "PHASE", value: (t) => t.phase || "-", wide: true },
  { header: "AGE", value: (t) => ago(t.createdAt), wide: true },
];

export const TASK_DESCRIBE: DescribeField<Task>[] = [
  { label: "Title", value: (t) => t.title },
  { label: "Slug", value: (t) => t.slug },
  { label: "ID", value: (t) => t.id },
  { label: "Status", value: (t) => t.status },
  { label: "Priority", value: (t) => t.priority },
  { label: "Type", value: (t) => t.type ?? "-" },
  { label: "Phase", value: (t) => t.phase || "-" },
  { label: "Description", value: (t) => t.description || "-" },
  { label: "Project ID", value: (t) => t.projectId ?? "-" },
  { label: "Parent ID", value: (t) => t.parentId ?? "-" },
  { label: "Team ID", value: (t) => t.teamId },
  { label: "Assignees", value: (t) => t.assigneeIds.length > 0 ? t.assigneeIds : undefined },
  { label: "Dependencies", value: (t) => t.dependencies.length > 0 ? t.dependencies : undefined },
  { label: "Offloadable", value: (t) => t.offloadable ? "Yes" : "No" },
  { label: "Comments", value: (t) => String(t.commentCount) },
  { label: "Created", value: (t) => t.createdAt },
  { label: "Updated", value: (t) => t.updatedAt },
  {
    label: "Inputs",
    value: (t) =>
      t.inputs.length > 0 ? t.inputs.map((a) => `${a.type}: ${a.label}`) : undefined,
  },
  {
    label: "Outputs",
    value: (t) =>
      t.outputs.length > 0 ? t.outputs.map((a) => `${a.type}: ${a.label}`) : undefined,
  },
  {
    label: "Acceptance Criteria",
    value: (t) =>
      t.acceptanceCriteria.length > 0
        ? t.acceptanceCriteria.map((c) => `[${c.met ? "x" : " "}] ${c.description}`)
        : undefined,
  },
];

// ── Conversations ─────────────────────────────────────────────────────────────

export const CONVERSATION_COLUMNS: ColumnDef<Conversation>[] = [
  { header: "TITLE", value: (c) => truncate(c.title, 40) },
  { header: "TYPE", value: (c) => c.type },
  { header: "MESSAGES", value: (c) => String(c.messageCount) },
  { header: "PARTICIPANTS", value: (c) => String(c.participantIds.length) },
  { header: "LAST MESSAGE", value: (c) => ago(c.lastMessageAt) },
  { header: "ID", value: (c) => c.id, wide: true },
];

export const CONVERSATION_DESCRIBE: DescribeField<Conversation>[] = [
  { label: "Title", value: (c) => c.title },
  { label: "ID", value: (c) => c.id },
  { label: "Type", value: (c) => c.type },
  { label: "Messages", value: (c) => String(c.messageCount) },
  { label: "Participants", value: (c) => c.participantIds },
  { label: "Project ID", value: (c) => c.projectId ?? undefined },
  { label: "Task ID", value: (c) => c.taskId ?? undefined },
  { label: "Last Message", value: (c) => c.lastMessageAt },
];

// ── Agent Runtimes ────────────────────────────────────────────────────────────

export const RUNTIME_COLUMNS: ColumnDef<AgentRuntime>[] = [
  { header: "AGENT", value: (r) => r.memberId },
  { header: "STATUS", value: (r) => r.status, color: (r) => colorize(r.status) },
  { header: "CONTAINER", value: (r) => r.containerId?.slice(0, 12) ?? "-" },
  { header: "VNC", value: (r) => r.vncPort ? String(r.vncPort) : "-" },
  { header: "LIFECYCLE", value: (r) => r.lifecycle },
  { header: "HEALTH", value: (r) => ago(r.lastHealthCheck) },
];

// ── Workspace ─────────────────────────────────────────────────────────────────

export const WORKSPACE_DESCRIBE: DescribeField<Workspace>[] = [
  { label: "Name", value: (w) => w.displayName },
  { label: "Slug", value: (w) => w.slug },
  { label: "ID", value: (w) => w.id },
  { label: "Industry", value: (w) => w.industry },
  { label: "Subtype", value: (w) => w.industrySubtype ?? "-" },
  { label: "Status", value: (w) => w.status },
  { label: "Default Provider", value: (w) => w.defaultProviderId },
  { label: "Color", value: (w) => w.branding.color },
  {
    label: "Providers",
    value: (w) =>
      w.providers.length > 0
        ? w.providers.map((p) => `${p.provider} (${p.defaultModel})`)
        : undefined,
  },
  {
    label: "Task Types",
    value: (w) =>
      w.taskTypes.length > 0
        ? w.taskTypes.map((t) => t.label)
        : undefined,
  },
  { label: "Created", value: (w) => w.createdAt },
];

// ── Providers ─────────────────────────────────────────────────────────────────

export const PROVIDER_COLUMNS: ColumnDef<ProviderConfig>[] = [
  { header: "PROVIDER", value: (p) => p.provider },
  { header: "MODEL", value: (p) => p.defaultModel },
  { header: "BASE URL", value: (p) => truncate(p.baseUrl, 50) },
  { header: "LABEL", value: (p) => p.label ?? "-", wide: true },
];
