/**
 * Provision workspace files for an agent before container start.
 *
 * Writes SOUL.md, AGENTS.md, TOOLS.md, USER.md, and openclaw.json
 * into the agent's data directory on the host volume.
 */

import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { runtime } from "./runtime";
import { toToml } from "./toml";
import type { AgentRuntimeType } from "./runtimes";

// ── Types for provisioning data (subset passed from Convex) ──────────────────

export interface ProvisionMember {
  id: string;
  name: string;
  title: string;
  specialization: string;
  teamId: string | null;
  isLead: boolean;
  system: boolean;
  type: "agent" | "human";
  identity?: {
    soul: string;
    skills: string[];
    memory: string[];
  };
  modelConfig?: {
    providerId?: string;
    model?: string;
    apiKeyOverride?: string;
  };
}

export interface ProvisionTeam {
  id: string;
  name: string;
  leadId: string | null;
}

export interface ProvisionWorkspace {
  slug: string;
  displayName: string;
  industry: string;
}

export interface ProvisionProvider {
  providerId: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface ProvisionData {
  member: ProvisionMember;
  allMembers: ProvisionMember[];
  allTeams: ProvisionTeam[];
  workspace: ProvisionWorkspace;
  provider: ProvisionProvider;
}

// ── File generators ──────────────────────────────────────────────────────────

function buildSoulMd(member: ProvisionMember): string {
  const identity = member.identity;
  if (!identity) {
    return `# ${member.name}\n\n_No identity configured._\n`;
  }

  const memoryItems =
    identity.memory.length > 0
      ? identity.memory.map((m) => `- ${m}`).join("\n")
      : "_No memory context._";

  return `# ${member.name}

${identity.soul}

## Identity

- **ID**: ${member.id}
- **Role**: ${member.title}
- **Specialization**: ${member.specialization}
- **Team**: ${member.teamId}
- **Lead**: ${member.isLead ? "Yes" : "No"}

## Domain Skills

${identity.skills.map((s) => `- ${s}`).join("\n")}

## Memory Context

${memoryItems}
`;
}

function buildAgentsMd(
  member: ProvisionMember,
  allTeams: ProvisionTeam[],
  allMembers: ProvisionMember[],
  workspace: ProvisionWorkspace,
): string {
  const sections: string[] = [];

  // Header
  if (member.system) {
    const isKeros = member.name === "Keros" || member.title === "Project Manager";
    const roleLabel = isKeros
      ? "the workspace project manager"
      : "the workspace dispatcher";
    sections.push(`# ${member.name} — Workspace Agent\n`);
    sections.push(
      `You are **${member.name}**, ${roleLabel} for **${workspace.displayName}**.\n`,
    );
    sections.push(`Your session key: \`agent:${member.id}:main\`\n`);
  } else {
    sections.push(`# ${member.name} — Team Agent\n`);
    sections.push(
      `You are **${member.name}** on the **${member.teamId}** team.\n`,
    );
    sections.push(`Your session key: \`agent:${member.id}:main\`\n`);
  }

  // Core reasoning framework
  sections.push(`## Reasoning Framework\n`);
  sections.push(`Before responding, follow this process:\n`);
  sections.push(
    `1. **Understand**: Re-read the message. Identify the core intent.`,
  );
  sections.push(
    `2. **Scope check**: Is this within your role? If not, suggest a teammate.`,
  );
  sections.push(
    `3. **Confidence check**: 4-5 proceed, 2-3 flag uncertainty, 1 ask for clarification.`,
  );
  sections.push(
    `4. **Tool check**: Would a tool improve your answer? Use it.`,
  );
  sections.push(
    `5. **Respond**: Clear, structured answer using Markdown.\n`,
  );

  // Team roster
  if (member.system) {
    buildSystemTeamRoster(sections, member, allTeams, allMembers, workspace);
  } else {
    buildRegularTeamRoster(sections, member, allTeams, allMembers);
  }

  // Communication style
  sections.push(`## Communication Style\n`);
  sections.push(
    `Format responses using **Markdown**: bold, italic, code blocks, tables, lists, headings.`,
  );
  sections.push(
    `Supported: fenced code blocks with language IDs, Mermaid diagrams, LaTeX math, @mentions.\n`,
  );
  sections.push(
    `Mentions: \`@agent-name\` (agents), \`#project-slug\` (projects), \`~task-id\` (tasks), \`:file-name\` (files).\n`,
  );

  // Safety
  sections.push(`## Safety\n`);
  sections.push(
    `- System files (SOUL.md, AGENTS.md) are managed by the platform — do not modify`,
  );
  sections.push(
    `- Confirm before irreversible actions (deletions, deployments, external comms)`,
  );
  sections.push(
    `- Stay in scope — suggest the right teammate for out-of-scope requests`,
  );
  sections.push(
    `- Bias toward action, minimize chatter, verify before asserting\n`,
  );

  return sections.join("\n");
}

function buildRegularTeamRoster(
  sections: string[],
  member: ProvisionMember,
  allTeams: ProvisionTeam[],
  allMembers: ProvisionMember[],
): void {
  const myTeam = allTeams.find((t) => t.id === member.teamId);
  if (myTeam) {
    const teamMembers = allMembers.filter(
      (m) => m.teamId === myTeam.id && m.type === "agent",
    );
    sections.push(`## Your Team: ${myTeam.name}\n`);
    for (const m of teamMembers) {
      const leadTag = m.isLead ? " [Lead]" : "";
      const youTag = m.id === member.id ? " **(You)**" : "";
      sections.push(
        `- **${m.name}**${leadTag}${youTag} — ${m.title} (${m.specialization})`,
      );
    }
    sections.push("");
  }

  const otherTeams = allTeams.filter((t) => t.id !== member.teamId);
  if (otherTeams.length > 0) {
    sections.push(`## Other Teams\n`);
    for (const t of otherTeams) {
      const lead = allMembers.find((m) => m.id === t.id);
      sections.push(`- **${t.name}** — Lead: ${lead?.name ?? "unassigned"}`);
    }
    sections.push("");
  }

  sections.push(`## Escalation\n`);
  sections.push(`- Within team → team lead`);
  sections.push(`- Cross-team → @mention the other team's lead`);
  sections.push(`- Blocked → escalate to a human supervisor\n`);
}

function buildSystemTeamRoster(
  sections: string[],
  member: ProvisionMember,
  allTeams: ProvisionTeam[],
  allMembers: ProvisionMember[],
  workspace: ProvisionWorkspace,
): void {
  const agents = allMembers.filter((m) => m.type === "agent" && !m.system);
  const humans = allMembers.filter((m) => m.type === "human");
  const isKeros = member.name === "Keros" || member.title === "Project Manager";

  sections.push(`## Workspace: ${workspace.displayName}\n`);
  sections.push(
    `- **${allTeams.length}** teams, **${agents.length}** agents, **${humans.length}** humans`,
  );
  sections.push(`- Industry: ${workspace.industry}\n`);

  const otherSystem = allMembers.filter(
    (m) => m.system && m.id !== member.id,
  );
  if (otherSystem.length > 0) {
    sections.push(`## System Agents\n`);
    for (const sa of otherSystem) {
      sections.push(`- **${sa.name}** — ${sa.title}`);
    }
    sections.push("");
  }

  for (const team of allTeams) {
    const teamMembers = allMembers.filter(
      (m) => m.teamId === team.id && m.type === "agent",
    );
    if (teamMembers.length === 0) continue;
    sections.push(`## ${team.name}\n`);
    for (const m of teamMembers) {
      const leadTag = m.isLead ? " [Lead]" : "";
      sections.push(
        `- **${m.name}**${leadTag} — ${m.title} (${m.specialization})`,
      );
    }
    sections.push("");
  }

  if (isKeros) {
    sections.push(`## Role: Project Manager\n`);
    sections.push(
      `- Break user intents into projects, phases, and tasks`,
    );
    sections.push(`- Create WBS/PRD documents in project drives`);
    sections.push(`- Assign tasks to the right teams/agents`);
    sections.push(
      `- You build scaffolding — teams execute the work\n`,
    );
  } else {
    sections.push(`## Role: Dispatcher\n`);
    sections.push(
      `- Route user questions to the appropriate agent`,
    );
    sections.push(`- Provide workspace overview and org structure`);
    sections.push(
      `- Delegate project work to Keros (project manager)`,
    );
    sections.push(
      `- Never perform domain-specific work — delegate to specialists\n`,
    );
  }
}

function buildToolsMd(member: ProvisionMember): string {
  const isKeros = member.name === "Keros" || member.title === "Project Manager";
  const isMono = member.name === "Mono" || member.title === "Dispatcher";

  const permissionsTable = member.system
    ? isKeros
      ? `| Scope | Read | Write |
|-------|------|-------|
| Personal drive (\`members/${member.id}\`) | Yes | Yes |
| All team drives | Yes | No |
| All project drives | Yes | Yes |
| Workspace shared drive | Yes | No |`
      : `| Scope | Read | Write |
|-------|------|-------|
| Personal drive (\`members/${member.id}\`) | Yes | Yes |
| All team drives | Yes | No |
| All project drives | Yes | No |
| Workspace shared drive | Yes | No |`
    : `| Scope | Read | Write |
|-------|------|-------|
| Personal drive (\`members/${member.id}\`) | Yes | Yes |
| Team drive (\`teams/${member.teamId}\`) | Yes | Yes |
| Assigned project drives | Yes | Yes |
| Other teams' drives | Yes | No |
| Workspace shared drive | Yes | No |`;

  const sections: string[] = [];

  sections.push(`# Tools & Environment\n`);

  // ── Chat Commands ──────────────────────────────────────
  sections.push(`## Chat Commands\n`);
  sections.push(`Commands are typed directly in chat. They execute instantly and produce a system response.\n`);
  sections.push(`| Command | Context | Description |`);
  sections.push(`|---------|---------|-------------|`);
  sections.push(`| \`/assign @name\` | task_thread, project_chat | Add member to assignees |`);
  sections.push(`| \`/unassign @name\` | task_thread, project_chat | Remove member from assignees |`);
  sections.push(`| \`/parent ~ref\` | task_thread | Set parent task (hierarchy) |`);
  sections.push(`| \`/link ~ref\` | task_thread | Add task dependency |`);
  sections.push(`| \`/unlink ~ref\` | task_thread | Remove task dependency |`);
  sections.push(`| \`/input :path\` | task_thread | Add input artifact |`);
  sections.push(`| \`/output :path\` | task_thread | Add output artifact |`);
  sections.push(`| \`/set status\` | task_thread, project_chat | Set status (e.g. \`/set in_progress\`) |`);
  sections.push(`| \`/start\` | task_thread | Set in_progress + assign self |`);
  sections.push(`| \`/finish\` | task_thread | Set done (respects acceptance gate) |`);
  sections.push(``);
  sections.push(`Reference sigils: \`@agent-name\`, \`~task-slug\`, \`:file-path\`, \`#project-slug\`\n`);

  // ── Status Management ─────────────────────────────────
  sections.push(`## Status Management\n`);
  sections.push(`Update your status with \`members.update_status\` to reflect what you're doing:\n`);
  sections.push(`| Status | When to set |`);
  sections.push(`|--------|-------------|`);
  sections.push(`| \`idle\` | Default. No active task. Ready for work. |`);
  sections.push(`| \`working\` | Actively executing a task. Set \`currentTaskId\` too. |`);
  sections.push(`| \`reviewing\` | Reviewing another agent's work (cross-validation). |`);
  sections.push(`| \`blocked\` | Waiting on a dependency, input, or human approval. |`);
  sections.push(`| \`offline\` | Agent is shut down or unreachable. |`);
  sections.push(``);
  sections.push(`Always set status back to \`idle\` when you finish a task.\n`);

  // ── MCP Tool Reference ─────────────────────────────────
  sections.push(`## MCP Tool Reference\n`);
  sections.push(
    `Tools are provided via MCP (Model Context Protocol). Use them to interact with the MonokerOS workspace.\n`,
  );

  sections.push(`### Members\n`);
  sections.push(`| Tool | Description |`);
  sections.push(`|------|-------------|`);
  sections.push(`| \`members.list\` | List all workspace members |`);
  sections.push(`| \`members.get\` | Get member details by ID |`);
  sections.push(`| \`members.update_status\` | Update status + current task/project |`);
  if (member.system) {
    sections.push(`| \`members.create\` | Create a new agent member |`);
  }
  sections.push(``);

  sections.push(`### Teams\n`);
  sections.push(`| Tool | Description |`);
  sections.push(`|------|-------------|`);
  sections.push(`| \`teams.list\` | List all teams |`);
  sections.push(`| \`teams.get\` | Get team details + members |`);
  if (member.system) {
    sections.push(`| \`teams.create\` | Create a new team |`);
  }
  sections.push(``);

  sections.push(`### Projects\n`);
  sections.push(`| Tool | Description |`);
  sections.push(`|------|-------------|`);
  sections.push(`| \`projects.list\` | List projects (filter by status, type) |`);
  sections.push(`| \`projects.get\` | Get project details |`);
  if (member.system || isKeros) {
    sections.push(`| \`projects.create\` | Create a new project |`);
    sections.push(`| \`projects.update\` | Update project fields |`);
  }
  if (isKeros) {
    sections.push(`| \`projects.update_gate\` | Update SDLC gate status |`);
  }
  sections.push(``);

  sections.push(`### Tasks\n`);
  sections.push(`| Tool | Description |`);
  sections.push(`|------|-------------|`);
  sections.push(`| \`tasks.list\` | List tasks (filter by project, status, assignee) |`);
  sections.push(`| \`tasks.get\` | Get full task details |`);
  sections.push(`| \`tasks.create\` | Create a new task |`);
  sections.push(`| \`tasks.update\` | Update task fields |`);
  sections.push(`| \`tasks.move\` | Move task to a status column |`);
  sections.push(`| \`tasks.assign\` | Replace task assignees |`);
  sections.push(`| \`tasks.set_parent\` | Set/clear parent task |`);
  sections.push(`| \`tasks.add_dependency\` | Add a task dependency |`);
  sections.push(`| \`tasks.remove_dependency\` | Remove a task dependency |`);
  sections.push(`| \`tasks.add_input\` | Add input artifact (file/URL) |`);
  sections.push(`| \`tasks.remove_input\` | Remove input artifact |`);
  sections.push(`| \`tasks.add_output\` | Add output artifact (file/URL) |`);
  sections.push(`| \`tasks.remove_output\` | Remove output artifact |`);
  sections.push(``);

  sections.push(`### Files\n`);
  sections.push(`| Tool | Description |`);
  sections.push(`|------|-------------|`);
  sections.push(`| \`files.list_drives\` | List all accessible drives |`);
  sections.push(`| \`files.read\` | Read file content |`);
  sections.push(`| \`files.create\` | Create a new file |`);
  sections.push(`| \`files.update\` | Update file content |`);
  sections.push(``);

  sections.push(`### Knowledge\n`);
  sections.push(`| Tool | Description |`);
  sections.push(`|------|-------------|`);
  sections.push(`| \`knowledge_search\` | Search across KNOWLEDGE directories |`);
  sections.push(``);

  sections.push(`### Conversations\n`);
  sections.push(`| Tool | Description |`);
  sections.push(`|------|-------------|`);
  sections.push(`| \`conversations.send_message\` | Send a message in a conversation |`);
  sections.push(`| \`conversations.list\` | List conversations |`);
  sections.push(`| \`conversations.get\` | Get conversation with messages |`);
  sections.push(``);

  if (member.system) {
    sections.push(`### Workspace Admin\n`);
    sections.push(`| Tool | Description |`);
    sections.push(`|------|-------------|`);
    sections.push(`| \`workspace.get\` | Get workspace configuration |`);
    sections.push(`| \`workspace.update\` | Update workspace settings |`);
    sections.push(``);
  }

  // ── Workspace Folder Conventions ──────────────────────────
  sections.push(`## Workspace Folder Conventions\n`);
  sections.push(`Your member drive has the following standard folders:\n`);
  sections.push(`| Folder | Purpose | Examples |`);
  sections.push(`|--------|---------|----------|`);
  sections.push(`| \`downloads/\` | Raw data, API responses, web scrapes, browser downloads | CSV exports, JSON dumps, screenshots |`);
  sections.push(`| \`outputs/\` | Clean deliverables, reports, code artifacts, summaries | Final reports, generated code, analysis results |`);
  sections.push(`| \`KNOWLEDGE/\` | Reference material (searchable via \`knowledge_search\`) | Guides, specs, documentation |`);
  sections.push(``);
  sections.push(`When creating files, use the \`files.create\` MCP tool and place them in the appropriate folder.\n`);

  sections.push(`## Drive Access Permissions\n`);
  sections.push(permissionsTable);
  sections.push("");

  return sections.join("\n");
}

function buildUserMd(): string {
  return `# User

_No user information yet. This file is updated as the agent learns about the user._
`;
}

// ── OpenClaw config ──────────────────────────────────────────────────────────
// Schema matches OpenClaw 2026.2.x — see https://docs.openclaw.ai/gateway/configuration-reference
//
// Provider/model mapping:
//   MonokerOS resolves (providerId, model) → OpenClaw uses "providerId/model" format.
//   All providers are defined in models.providers with baseUrl + apiKey env var ref.
//   API keys are injected as container env vars (LLM_API_KEY) and referenced via ${LLM_API_KEY}.

interface OpenClawConfig {
  agents: {
    defaults: {
      model: { primary: string; fallbacks?: string[] };
    };
    list: Array<{
      id: string;
      agentDir: string;
      workspace: string;
    }>;
  };
  browser: Record<string, unknown>;
  models: {
    mode: string;
    providers: Record<string, Record<string, unknown>>;
  };
  channels: Record<string, unknown>;
  tools: {
    profile: string;
  };
  gateway: {
    mode: string;
    port: number;
    bind: string;
    auth: { mode: string; token: string };
    http: {
      endpoints: {
        chatCompletions: { enabled: boolean };
      };
    };
  };
  session: { dmScope: string; reset: { mode: string; atHour: number } };
}

export function buildOpenClawConfig(
  agentId: string,
  provider: ProvisionProvider,
  workspaceSlug: string,
  desktop: boolean = true,
): OpenClawConfig {
  const dataPath = `/data/${agentId}`;
  const modelId = `${provider.providerId}/${provider.model}`;

  return {
    agents: {
      defaults: {
        model: { primary: modelId },
      },
      list: [
        {
          id: agentId,
          agentDir: dataPath,
          workspace: `${dataPath}/workspace`,
        },
      ],
    },
    browser: {
      enabled: true,
      defaultProfile: "openclaw",
      headless: !desktop,
      noSandbox: true,
      attachOnly: desktop,
      executablePath: "/usr/bin/google-chrome-stable",
      profiles: {
        openclaw: {
          cdpPort: 18800,
          color: "#FF4500",
        },
      },
    },
    models: {
      mode: "merge",
      providers: {
        [provider.providerId]: {
          baseUrl: provider.baseUrl,
          apiKey: "${LLM_API_KEY}",
          api: "openai-completions",
          models: [
            {
              id: provider.model,
              name: provider.model,
              contextWindow: 128000,
            },
          ],
        },
      },
    },
    channels: {
      ...(process.env.TELEGRAM_BOT_TOKEN && {
        telegram: {
          enabled: true,
          botToken: process.env.TELEGRAM_BOT_TOKEN,
        },
      }),
      ...(process.env.ENABLE_WHATSAPP === "true" && {
        whatsapp: { enabled: true },
      }),
    },
    tools: {
      profile: "full",
    },
    gateway: {
      mode: "local",
      port: 18789,
      bind: "lan",
      auth: {
        mode: "token",
        token: process.env.MK_API_KEY ?? "mk_dev_system",
      },
      http: {
        endpoints: {
          chatCompletions: { enabled: true },
        },
      },
    },
    session: {
      dmScope: "per-channel-peer",
      reset: { mode: "daily", atHour: 4 },
    },
  };
}

// ── ZeroClaw TOML config ─────────────────────────────────────────────────────

const TEI_URL = process.env.TEI_URL ?? "http://tei:80";

export function buildZeroClawConfig(
  agentId: string,
  provider: ProvisionProvider,
  _workspaceSlug: string,
): string {
  const dataPath = `/data/${agentId}`;
  const modelId = `${provider.providerId}/${provider.model}`;
  const mcpUrl =
    process.env.MONOKEROS_API_URL ?? "http://container-service:3002";

  const config: Record<string, unknown> = {
    agents: {
      defaults: {
        model: { primary: modelId },
      },
      list: [
        {
          id: agentId,
          agent_dir: dataPath,
          workspace: `${dataPath}/workspace`,
        },
      ],
    },
    models: {
      providers: {
        [provider.providerId]: {
          base_url: provider.baseUrl,
          api_key_env: "LLM_API_KEY",
          api: "openai",
        },
      },
    },
    memory: {
      backend: "sqlite",
      embedding_provider: `custom:${TEI_URL}`,
      vector_weight: 0.7,
      keyword_weight: 0.3,
    },
    mcp: [
      {
        name: "monokeros",
        transport: "Http",
        url: `${mcpUrl}/api/mcp`,
        headers: { Authorization: "Bearer ${MK_API_KEY}" },
      },
    ],
    gateway: {
      host: "0.0.0.0",
      port: 18789,
      allow_public_bind: true,
      require_pairing: false,
    },
  };

  return toToml(config as Record<string, any>);
}

// ── Public API ───────────────────────────────────────────────────────────────

const KNOWLEDGE_DIR = "KNOWLEDGE";
const MK_API_KEY = process.env.MK_API_KEY ?? "mk_dev_system";
const CONVEX_URL = process.env.CONVEX_SITE_URL ?? "";

/**
 * Sync provisioned files to Convex so they appear in the member drive.
 * Fire-and-forget — filesystem is the primary source during provisioning.
 */
async function syncFilesToConvex(
  agentId: string,
  workspaceSlug: string,
  files: Array<{
    name: string;
    path: string;
    type: "file" | "directory";
    content?: string;
  }>,
): Promise<void> {
  if (!CONVEX_URL) return;

  try {
    await fetch(`${CONVEX_URL}/api/files/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MK_API_KEY}`,
      },
      body: JSON.stringify({
        workspaceSlug,
        memberId: agentId,
        files,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error(
      `[provision] Failed to sync files to Convex: ${err instanceof Error ? err.message : err}`,
    );
  }
}

export async function provision(
  agentId: string,
  dataDir: string,
  data?: ProvisionData,
  runtimeType: AgentRuntimeType = "openclaw",
  desktop?: boolean,
): Promise<void> {
  const resolvedDesktop = desktop ?? (runtimeType === "openclaw");
  const dir = join(dataDir, agentId);
  const wsDir = join(dir, "workspace");

  mkdirSync(join(dir, "memory"), { recursive: true });
  mkdirSync(wsDir, { recursive: true });
  mkdirSync(join(dir, KNOWLEDGE_DIR), { recursive: true });
  mkdirSync(join(dir, "sessions"), { recursive: true });
  mkdirSync(join(wsDir, "downloads"), { recursive: true });
  mkdirSync(join(wsDir, "outputs"), { recursive: true });

  if (!data) {
    // No provisioning data — just ensure directories exist
    console.log(
      `[provision] Directories created for ${agentId} (no data provided)`,
    );
    return;
  }

  const { member, allMembers, allTeams, workspace, provider } = data;

  // Generate file contents
  const soulMd = buildSoulMd(member);
  const agentsMd = buildAgentsMd(member, allTeams, allMembers, workspace);
  const toolsMd = buildToolsMd(member);
  const userMd = buildUserMd();

  // Write to host filesystem (OpenClaw reads from here)
  await Promise.all([
    Bun.write(join(wsDir, "SOUL.md"), soulMd),
    Bun.write(join(wsDir, "AGENTS.md"), agentsMd),
    Bun.write(join(wsDir, "TOOLS.md"), toolsMd),
    Bun.write(join(wsDir, "USER.md"), userMd),
  ]);

  // Write runtime config (openclaw.json or config.toml)
  if (runtimeType === "zeroclaw") {
    const tomlConfig = buildZeroClawConfig(agentId, provider, workspace.slug);
    await Bun.write(join(dir, "config.toml"), tomlConfig);
  } else {
    const config = buildOpenClawConfig(agentId, provider, workspace.slug, resolvedDesktop);
    await Bun.write(join(dir, "openclaw.json"), JSON.stringify(config, null, 2));
  }

  // Sync files to Convex (fire-and-forget) so they appear in the frontend
  syncFilesToConvex(agentId, workspace.slug, [
    { name: "SOUL.md", path: "SOUL.md", type: "file", content: soulMd },
    { name: "AGENTS.md", path: "AGENTS.md", type: "file", content: agentsMd },
    { name: "TOOLS.md", path: "TOOLS.md", type: "file", content: toolsMd },
    { name: "USER.md", path: "USER.md", type: "file", content: userMd },
    { name: "KNOWLEDGE", path: "KNOWLEDGE", type: "directory" },
    { name: "downloads", path: "downloads", type: "directory" },
    { name: "outputs", path: "outputs", type: "directory" },
  ]);

  console.log(`[provision] Agent ${agentId} provisioned`);
}
