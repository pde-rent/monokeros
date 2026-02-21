import type { Member, Team, Workspace } from '@monokeros/types';

/**
 * OpenClaw workspace file generators.
 *
 * OpenClaw agents expect:
 *   SOUL.md   — identity, personality, role
 *   AGENTS.md — team topology, workspace instructions, communication
 *   USER.md   — info about the human interacting (optional)
 *   TOOLS.md  — tool usage notes and environment context
 *   skills/   — skill definitions (we use MCP instead)
 */

/* ═══════════════════════════════════════════════════════════════════
 * SOUL.md — Identity and personality (combines old SOUL + IDENTITY)
 * ═══════════════════════════════════════════════════════════════════ */

export function buildSoulMd(member: Member): string {
  const memoryItems = member.identity!.memory.length > 0
    ? member.identity!.memory.map((m) => `- ${m}`).join('\n')
    : '_No memory context._';

  return `# ${member.name}

${member.identity!.soul}

## Identity

- **ID**: ${member.id}
- **Role**: ${member.title}
- **Specialization**: ${member.specialization}
- **Team**: ${member.teamId}
- **Lead**: ${member.isLead ? 'Yes' : 'No'}

## Domain Skills

${member.identity!.skills.map((s) => `- ${s}`).join('\n')}

## Memory Context

${memoryItems}
`;
}

/* ═══════════════════════════════════════════════════════════════════
 * AGENTS.md — Team topology, routing, communication
 * Combines old AGENTS.md + FOUNDATION.md for OpenClaw compatibility
 * ═══════════════════════════════════════════════════════════════════ */

export function buildAgentsMd(
  member: Member,
  allTeams: Team[],
  allMembers: Member[],
  workspace?: Workspace,
): string {
  const sections: string[] = [];

  // Header
  if (member.system && workspace) {
    const isKeros = member.id?.startsWith('system_keros') ?? false;
    const roleLabel = isKeros ? 'the workspace project manager' : 'the workspace dispatcher';
    sections.push(`# ${member.name} — Workspace Agent\n`);
    sections.push(`You are **${member.name}**, ${roleLabel} for **${workspace.displayName}**.\n`);
    sections.push(`Your session key: \`agent:${member.id}:main\`\n`);
  } else {
    sections.push(`# ${member.name} — Team Agent\n`);
    sections.push(`You are **${member.name}** on the **${member.teamId}** team.\n`);
    sections.push(`Your session key: \`agent:${member.id}:main\`\n`);
  }

  // Core reasoning framework (from FOUNDATION.md)
  sections.push(`## Reasoning Framework\n`);
  sections.push(`Before responding, follow this process:\n`);
  sections.push(`1. **Understand**: Re-read the message. Identify the core intent.`);
  sections.push(`2. **Scope check**: Is this within your role? If not, suggest a teammate.`);
  sections.push(`3. **Confidence check**: 4-5 proceed, 2-3 flag uncertainty, 1 ask for clarification.`);
  sections.push(`4. **Tool check**: Would a tool improve your answer? Use it.`);
  sections.push(`5. **Respond**: Clear, structured answer using Markdown.\n`);

  // Team roster
  if (member.system && workspace) {
    buildSystemTeamRoster(sections, member, allTeams, allMembers, workspace);
  } else {
    buildRegularTeamRoster(sections, member, allTeams, allMembers);
  }

  // Communication style
  sections.push(`## Communication Style\n`);
  sections.push(`Format responses using **Markdown**: bold, italic, code blocks, tables, lists, headings.`);
  sections.push(`Supported: fenced code blocks with language IDs, Mermaid diagrams, LaTeX math, @mentions.\n`);
  sections.push(`Mentions: \`@agent-name\` (agents), \`#project-slug\` (projects), \`~task-id\` (tasks), \`:file-name\` (files).\n`);

  // Safety
  sections.push(`## Safety\n`);
  sections.push(`- System files (SOUL.md, AGENTS.md) are managed by the platform — do not modify`);
  sections.push(`- Confirm before irreversible actions (deletions, deployments, external comms)`);
  sections.push(`- Stay in scope — suggest the right teammate for out-of-scope requests`);
  sections.push(`- Bias toward action, minimize chatter, verify before asserting\n`);

  return sections.join('\n');
}

function buildRegularTeamRoster(
  sections: string[],
  member: Member,
  allTeams: Team[],
  allMembers: Member[],
): void {
  // Own team
  const myTeam = allTeams.find((t) => t.id === member.teamId);
  if (myTeam) {
    const teamMembers = allMembers.filter((m) => m.teamId === myTeam.id && m.type === 'agent');
    sections.push(`## Your Team: ${myTeam.name}\n`);
    for (const m of teamMembers) {
      const leadTag = m.isLead ? ' [Lead]' : '';
      const youTag = m.id === member.id ? ' **(You)**' : '';
      sections.push(`- **${m.name}**${leadTag}${youTag} — ${m.title} (${m.specialization})`);
    }
    sections.push('');
  }

  // Other teams
  const otherTeams = allTeams.filter((t) => t.id !== member.teamId);
  if (otherTeams.length > 0) {
    sections.push(`## Other Teams\n`);
    for (const t of otherTeams) {
      const lead = allMembers.find((m) => m.id === t.leadId);
      sections.push(`- **${t.name}** — Lead: ${lead?.name ?? 'unassigned'}`);
    }
    sections.push('');
  }

  // Escalation
  sections.push(`## Escalation\n`);
  sections.push(`- Within team → team lead`);
  sections.push(`- Cross-team → @mention the other team's lead`);
  sections.push(`- Blocked → escalate to a human supervisor\n`);
}

function buildSystemTeamRoster(
  sections: string[],
  member: Member,
  allTeams: Team[],
  allMembers: Member[],
  workspace: Workspace,
): void {
  const agents = allMembers.filter((m) => m.type === 'agent' && !m.system);
  const humans = allMembers.filter((m) => m.type === 'human');
  const isKeros = member.id?.startsWith('system_keros') ?? false;

  sections.push(`## Workspace: ${workspace.displayName}\n`);
  sections.push(`- **${allTeams.length}** teams, **${agents.length}** agents, **${humans.length}** humans`);
  sections.push(`- Industry: ${workspace.industry}\n`);

  // Other system agents
  const otherSystem = allMembers.filter((m) => m.system && m.id !== member.id);
  if (otherSystem.length > 0) {
    sections.push(`## System Agents\n`);
    for (const sa of otherSystem) {
      sections.push(`- **${sa.name}** — ${sa.title}`);
    }
    sections.push('');
  }

  // Full roster
  for (const team of allTeams) {
    const teamMembers = allMembers.filter((m) => m.teamId === team.id && m.type === 'agent');
    if (teamMembers.length === 0) continue;
    sections.push(`## ${team.name}\n`);
    for (const m of teamMembers) {
      const leadTag = m.isLead ? ' [Lead]' : '';
      sections.push(`- **${m.name}**${leadTag} — ${m.title} (${m.specialization})`);
    }
    sections.push('');
  }

  // Routing rules
  if (isKeros) {
    sections.push(`## Role: Project Manager\n`);
    sections.push(`- Break user intents into projects, phases, and tasks`);
    sections.push(`- Create WBS/PRD documents in project drives`);
    sections.push(`- Assign tasks to the right teams/agents`);
    sections.push(`- You build scaffolding — teams execute the work\n`);
  } else {
    sections.push(`## Role: Dispatcher\n`);
    sections.push(`- Route user questions to the appropriate agent`);
    sections.push(`- Provide workspace overview and org structure`);
    sections.push(`- Delegate project work to Keros (project manager)`);
    sections.push(`- Never perform domain-specific work — delegate to specialists\n`);
  }
}

/* ═══════════════════════════════════════════════════════════════════
 * TOOLS.md — Tool usage notes and environment context
 * Combines old SKILLS.md drive permissions with tool usage guidance
 * ═══════════════════════════════════════════════════════════════════ */

export function buildToolsMd(member: Member): string {
  const isKeros = member.id?.startsWith('system_keros');
  const isMono = member.id?.startsWith('system_mono');

  const permissionsTable = member.system
    ? (isKeros
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
| Workspace shared drive | Yes | No |`)
    : `| Scope | Read | Write |
|-------|------|-------|
| Personal drive (\`members/${member.id}\`) | Yes | Yes |
| Team drive (\`teams/${member.teamId}\`) | Yes | Yes |
| Assigned project drives | Yes | Yes |
| Other teams' drives | Yes | No |
| Workspace shared drive | Yes | No |`;

  const sections: string[] = [];

  sections.push(`# Tools & Environment\n`);
  sections.push(`## Available Tools\n`);
  sections.push(`Tools are provided via MCP (Model Context Protocol). Use them to interact with the MonokerOS workspace.\n`);
  sections.push(`### Key Tool Categories\n`);
  sections.push(`- **Files**: \`files.read\`, \`files.create\`, \`files.update\`, \`files.list_drives\``);
  sections.push(`- **Knowledge**: \`knowledge_search\` — search across all accessible KNOWLEDGE directories`);
  sections.push(`- **Members**: \`members.list\`, \`members.get\`, \`members.update_status\``);
  sections.push(`- **Teams**: \`teams.list\`, \`teams.get\``);
  sections.push(`- **Projects**: \`projects.list\`, \`projects.get\``);
  sections.push(`- **Tasks**: \`tasks.list\`, \`tasks.get\`, \`tasks.move\``);
  sections.push(`- **Conversations**: \`conversations.send_message\``);

  if (member.system) {
    sections.push(`- **Workspace**: \`workspace.get\`, \`workspace.update\``);
    sections.push(`- **Admin**: \`members.create\`, \`teams.create\`, \`projects.create\``);
  }

  if (isKeros) {
    sections.push(`- **PM**: \`tasks.create\`, \`tasks.assign\`, \`tasks.move\`, \`projects.update_gate\``);
  }

  if (isMono) {
    sections.push(`- **Delegation**: Send messages to Keros via \`conversations.send_message\``);
  }

  sections.push('');
  sections.push(`## Drive Access Permissions\n`);
  sections.push(permissionsTable);
  sections.push('');

  return sections.join('\n');
}

/* ═══════════════════════════════════════════════════════════════════
 * USER.md — Info about the human (placeholder, filled during use)
 * ═══════════════════════════════════════════════════════════════════ */

export function buildUserMd(): string {
  return `# User

_No user information yet. This file is updated as the agent learns about the user._
`;
}
