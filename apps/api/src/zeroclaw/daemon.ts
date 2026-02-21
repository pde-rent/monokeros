/**
 * ZeroClaw Daemon - Standalone Bun HTTP server
 *
 * Spawned as a child process by ZeroClawService.
 * Reads config.toml, SOUL.md, FOUNDATION.md, AGENTS.md, and SKILLS.md from CWD.
 * Exposes /health and /webhook.
 * Supports GLM-5 tool calling for web search, web reader, and file access.
 */

import { DAEMON_MAX_HISTORY, LLM_TIMEOUT_MS, TOOL_REQUEST_TIMEOUT_MS, DEFAULT_ZAI_BASE_URL, DEFAULT_ZAI_MODEL, API_PORT, FILE_FETCH_TIMEOUT_MS } from '@monokeros/constants';

/** @deprecated Will be replaced by Unix domain sockets */
const ZEROCLAW_BASE_PORT = 4000;

export {};

// ── Minimal TOML parser (handles our known config format) ──────────────────
function parseToml(text: string): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  let currentSection = '_root';
  result[currentSection] = {};

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Section header: [section] or [section.subsection]
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] ??= {};
      continue;
    }

    // Key = value
    const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (kvMatch) {
      let value = kvMatch[2].trim();
      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[currentSection][kvMatch[1]] = value;
    }
  }
  return result;
}

// ── Tool definitions for GLM-5 function calling ────────────────────────────

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for current information. Returns page titles, URLs, and summaries.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_read',
      description: 'Fetch and read the full content of a web page given its URL.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The full URL of the page to read.',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'file_read',
      description: 'Read a file from a drive. Accessible drives: members (personal), teams (team shared), projects (project files), workspace (global shared).',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['members', 'teams', 'projects', 'workspace'],
            description: 'The drive category.',
          },
          owner_id: {
            type: 'string',
            description: 'The owner ID (member ID, team ID, or project ID). Use "shared" for workspace.',
          },
          path: {
            type: 'string',
            description: 'The file path within the drive (e.g., "/docs/readme.md").',
          },
        },
        required: ['category', 'owner_id', 'path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'file_write',
      description: 'Create or update a file on a drive you have write access to (your personal drive, team drive, or assigned project drives).',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['members', 'teams', 'projects'],
            description: 'The drive category.',
          },
          owner_id: {
            type: 'string',
            description: 'The owner ID (member ID, team ID, or project ID).',
          },
          path: {
            type: 'string',
            description: 'The file path within the drive.',
          },
          content: {
            type: 'string',
            description: 'The file content to write.',
          },
        },
        required: ['category', 'owner_id', 'path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_drives',
      description: 'List all available drives and their file trees. Returns team drives, member drives, project drives, and the workspace drive.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'knowledge_search',
      description: 'Search across all accessible KNOWLEDGE directories for reference material. Returns matching files with snippets and relevance scores.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search terms to look for in knowledge files.',
          },
        },
        required: ['query'],
      },
    },
  },
];

// ── Admin tool definitions (only for system agents with admin context) ───

const ADMIN_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function' as const,
    function: {
      name: 'create_team',
      description: 'Create a new team in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Team name (kebab-case).' },
          type: { type: 'string', description: 'Team type (e.g., engineering, design, qa).' },
          color: { type: 'string', description: 'Hex color (e.g., #8b5cf6).' },
          leadId: { type: 'string', description: 'Member ID of the team lead.' },
        },
        required: ['name', 'type', 'color', 'leadId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_member',
      description: 'Add a new agent member to a team.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agent display name.' },
          title: { type: 'string', description: 'Job title.' },
          specialization: { type: 'string', description: 'Area of expertise.' },
          teamId: { type: 'string', description: 'Team to assign to.' },
          isLead: { type: 'boolean', description: 'Whether this agent is a team lead.' },
          soul: { type: 'string', description: 'Personality and values description.' },
          skills: { type: 'array', items: { type: 'string' }, description: 'List of skills.' },
        },
        required: ['name', 'title', 'specialization', 'teamId', 'soul', 'skills'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_team',
      description: 'Modify team configuration.',
      parameters: {
        type: 'object',
        properties: {
          team_id: { type: 'string', description: 'The team ID to update.' },
          name: { type: 'string', description: 'New team name.' },
          type: { type: 'string', description: 'New team type.' },
          color: { type: 'string', description: 'New hex color.' },
          leadId: { type: 'string', description: 'New team lead member ID.' },
        },
        required: ['team_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_project',
      description: 'Create a new project.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name.' },
          description: { type: 'string', description: 'Project description.' },
          types: { type: 'array', items: { type: 'string' }, description: 'Project types.' },
          phases: { type: 'array', items: { type: 'string' }, description: 'Project phases.' },
          assignedTeamIds: { type: 'array', items: { type: 'string' }, description: 'Team IDs to assign.' },
          assignedMemberIds: { type: 'array', items: { type: 'string' }, description: 'Member IDs to assign.' },
        },
        required: ['name', 'types', 'phases'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_workspace',
      description: 'Update workspace settings.',
      parameters: {
        type: 'object',
        properties: {
          displayName: { type: 'string', description: 'New workspace display name.' },
          industry: { type: 'string', description: 'Workspace industry.' },
        },
      },
    },
  },
];

// ── PM tool definitions (for Keros - project manager) ─────────────────────

const PM_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function' as const,
    function: {
      name: 'create_task',
      description: 'Create a new task in a project. Assigns it to a team and/or specific members.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title.' },
          description: { type: 'string', description: 'Task description.' },
          projectId: { type: 'string', description: 'Project ID to create the task in.' },
          teamId: { type: 'string', description: 'Team ID to assign the task to.' },
          assigneeIds: { type: 'array', items: { type: 'string' }, description: 'Member IDs to assign.' },
          phase: { type: 'string', description: 'Project phase for this task.' },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'none'], description: 'Task priority.' },
          type: { type: 'string', description: 'Task type (e.g., content, research, design).' },
        },
        required: ['title', 'projectId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'assign_task',
      description: 'Assign a task to specific team members.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'The task ID to assign.' },
          assigneeIds: { type: 'array', items: { type: 'string' }, description: 'Member IDs to assign.' },
        },
        required: ['task_id', 'assigneeIds'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_task',
      description: 'Change a task status (backlog, todo, in_progress, in_review, done).',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'The task ID to move.' },
          status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done'], description: 'New status.' },
        },
        required: ['task_id', 'status'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_task',
      description: 'Update task metadata (title, description, priority, phase, type).',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'The task ID to update.' },
          title: { type: 'string', description: 'New title.' },
          description: { type: 'string', description: 'New description.' },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'none'], description: 'New priority.' },
          phase: { type: 'string', description: 'New phase.' },
          type: { type: 'string', description: 'New type.' },
        },
        required: ['task_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_tasks',
      description: 'List tasks with optional filters by project, status, or assignee.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Filter by project ID.' },
          status: { type: 'string', description: 'Filter by status.' },
          assigneeId: { type: 'string', description: 'Filter by assignee member ID.' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_members',
      description: 'List all workspace members (agents and humans).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_teams',
      description: 'List all workspace teams with their members.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_projects',
      description: 'List all workspace projects.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_project',
      description: 'Update project metadata.',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'The project ID to update.' },
          name: { type: 'string', description: 'New project name.' },
          description: { type: 'string', description: 'New description.' },
          status: { type: 'string', description: 'New status.' },
        },
        required: ['project_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_gate',
      description: 'Advance or modify a project phase/gate.',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'The project ID.' },
          gate: { type: 'string', description: 'Phase/gate name.' },
          status: { type: 'string', enum: ['open', 'closed'], description: 'Gate status.' },
        },
        required: ['project_id', 'gate', 'status'],
      },
    },
  },
];

// ── Delegation tool (for Mono to delegate to Keros) ──────────────────────

const DELEGATION_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function' as const,
    function: {
      name: 'delegate_to_keros',
      description: 'Delegate a project management request to Keros (the workspace project manager). Use this when the user\'s intent involves creating projects, planning work, building WBS/PRD, managing tasks, or any work that implies project-level effort.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The intent/request to delegate to Keros. Include all relevant context from the user\'s message.' },
        },
        required: ['message'],
      },
    },
  },
];

// ── Conversation history (bounded per conversation) ────────────────────────
type Message =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

const conversations = new Map<string, Message[]>();

// ── Tool execution ─────────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 5;

async function executeToolCall(
  toolCall: ToolCall,
  apiBaseUrl: string,
  apiKey: string,
  internalApiBase: string,
  internalAuthHeaders: Record<string, string>,
  agentMemberId: string,
  workspaceSlug: string,
): Promise<string> {
  const { name, arguments: argsStr } = toolCall.function;
  let args: Record<string, string>;
  try {
    args = JSON.parse(argsStr);
  } catch {
    return JSON.stringify({ error: `Invalid JSON arguments: ${argsStr}` });
  }

  const wsBase = `${internalApiBase}/workspaces/${workspaceSlug}`;

  try {
    switch (name) {
      case 'web_search':
        return await toolWebSearch(args.query, apiBaseUrl, apiKey);
      case 'web_read':
        return await toolWebRead(args.url, apiBaseUrl, apiKey);
      case 'file_read':
        return await toolFileRead(args.category, args.owner_id, args.path, wsBase, internalAuthHeaders);
      case 'file_write':
        return await toolFileWrite(args.category, args.owner_id, args.path, args.content, wsBase, internalAuthHeaders);
      case 'list_drives':
        return await toolListDrives(wsBase, internalAuthHeaders);
      case 'knowledge_search':
        return await toolKnowledgeSearch(args.query, agentMemberId, wsBase, internalAuthHeaders);
      // Admin tools
      case 'create_team':
        return await toolAdminPost(`${wsBase}/teams`, args, internalAuthHeaders);
      case 'create_member':
        return await toolAdminCreateMember(args, wsBase, internalAuthHeaders);
      case 'update_team':
        return await toolAdminPatch(`${wsBase}/teams/${args.team_id}`, args, ['team_id'], internalAuthHeaders);
      case 'create_project':
        return await toolAdminPost(`${wsBase}/projects`, args, internalAuthHeaders);
      case 'update_workspace':
        return await toolAdminPatch(`${wsBase}/config`, args, [], internalAuthHeaders);
      // PM tools (Keros)
      case 'create_task':
        return await toolAdminPost(`${wsBase}/tasks`, args, internalAuthHeaders);
      case 'assign_task':
        return await toolAdminPatch(`${wsBase}/tasks/${args.task_id}/assign`, args, ['task_id'], internalAuthHeaders);
      case 'move_task':
        return await toolAdminPatch(`${wsBase}/tasks/${args.task_id}/move`, args, ['task_id'], internalAuthHeaders);
      case 'update_task':
        return await toolAdminPatch(`${wsBase}/tasks/${args.task_id}`, args, ['task_id'], internalAuthHeaders);
      case 'list_tasks':
        return await toolAdminGet(`${wsBase}/tasks`, args, internalAuthHeaders);
      case 'list_members':
        return await toolAdminGet(`${wsBase}/members`, {}, internalAuthHeaders);
      case 'list_teams':
        return await toolAdminGet(`${wsBase}/teams`, {}, internalAuthHeaders);
      case 'list_projects':
        return await toolAdminGet(`${wsBase}/projects`, {}, internalAuthHeaders);
      case 'update_project':
        return await toolAdminPatch(`${wsBase}/projects/${args.project_id}`, args, ['project_id'], internalAuthHeaders);
      case 'update_gate':
        return await toolAdminPatch(`${wsBase}/projects/${args.project_id}/gate`, args, ['project_id'], internalAuthHeaders);
      // Delegation tool (Mono → Keros)
      case 'delegate_to_keros':
        return await toolDelegateToKeros(args.message, wsBase, workspaceSlug, internalAuthHeaders);
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: `Tool ${name} failed: ${err instanceof Error ? err.message : String(err)}` });
  }
}

async function toolWebSearch(query: string, apiBaseUrl: string, apiKey: string): Promise<string> {
  // Use z.ai web search MCP endpoint via direct HTTP
  const url = 'https://api.z.ai/api/mcp/web_search_prime/mcp';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'webSearchPrime', arguments: { query, count: 5 } },
    }),
    signal: AbortSignal.timeout(TOOL_REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    // Fallback: use the LLM's own knowledge
    return JSON.stringify({ fallback: true, message: `Web search unavailable (${res.status}). Use your own knowledge.` });
  }

  const data = await res.json() as { result?: { content?: Array<{ text?: string }> } };
  const text = data.result?.content?.[0]?.text;
  return text ?? JSON.stringify({ results: [] });
}

async function toolWebRead(pageUrl: string, apiBaseUrl: string, apiKey: string): Promise<string> {
  const url = 'https://api.z.ai/api/mcp/web_reader/mcp';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'webReader', arguments: { url: pageUrl } },
    }),
    signal: AbortSignal.timeout(TOOL_REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    return JSON.stringify({ fallback: true, message: `Web reader unavailable (${res.status}).` });
  }

  const data = await res.json() as { result?: { content?: Array<{ text?: string }> } };
  const text = data.result?.content?.[0]?.text;
  // Truncate to 10k chars to avoid context explosion
  return text ? text.slice(0, 10_000) : JSON.stringify({ error: 'No content returned' });
}

async function toolFileRead(
  category: string,
  ownerId: string,
  path: string,
  wsBase: string,
  headers: Record<string, string> = {},
): Promise<string> {
  const res = await fetch(
    `${wsBase}/files/${category}/${ownerId}/file?path=${encodeURIComponent(path)}`,
    { signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS), headers },
  );
  if (!res.ok) {
    const body = await res.text();
    return JSON.stringify({ error: `File read failed (${res.status}): ${body}` });
  }
  const data = await res.json() as { content?: string; name?: string; path?: string };
  return JSON.stringify({ name: data.name, path: data.path, content: data.content });
}

async function toolFileWrite(
  category: string,
  ownerId: string,
  path: string,
  content: string,
  wsBase: string,
  headers: Record<string, string> = {},
): Promise<string> {
  // Try to update existing file first
  const updateRes = await fetch(
    `${wsBase}/files/${category}/${ownerId}/content?path=${encodeURIComponent(path)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
    },
  );

  if (updateRes.ok) {
    const data = await updateRes.json() as { name?: string; path?: string };
    return JSON.stringify({ success: true, name: data.name, path: data.path });
  }

  // If file doesn't exist, create it
  const dir = path.substring(0, path.lastIndexOf('/')) || '/';
  const fullName = path.substring(path.lastIndexOf('/') + 1);
  const dotIdx = fullName.lastIndexOf('.');
  const name = dotIdx > 0 ? fullName.substring(0, dotIdx) : fullName;
  const extension = dotIdx > 0 ? fullName.substring(dotIdx + 1) : undefined;

  const createRes = await fetch(
    `${wsBase}/files/${category}/${ownerId}/file?dir=${encodeURIComponent(dir)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ name, extension, content }),
      signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
    },
  );

  if (!createRes.ok) {
    const body = await createRes.text();
    return JSON.stringify({ error: `File write failed (${createRes.status}): ${body}` });
  }
  const data = await createRes.json() as { name?: string; path?: string };
  return JSON.stringify({ success: true, created: true, name: data.name, path: data.path });
}

async function toolListDrives(wsBase: string, headers: Record<string, string> = {}): Promise<string> {
  const res = await fetch(`${wsBase}/files/drives`, {
    signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
    headers,
  });
  if (!res.ok) {
    return JSON.stringify({ error: `List drives failed (${res.status})` });
  }
  const data = await res.json();
  // Summarize to avoid huge payloads - just list drive names and top-level items
  return JSON.stringify(data, null, 0).slice(0, 8_000);
}

async function toolKnowledgeSearch(
  query: string,
  memberId: string,
  wsBase: string,
  headers: Record<string, string> = {},
): Promise<string> {
  const qs = new URLSearchParams({ query, memberId });
  const res = await fetch(`${wsBase}/knowledge/search?${qs}`, {
    signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
    headers,
  });
  if (!res.ok) {
    const body = await res.text();
    return JSON.stringify({ error: `Knowledge search failed (${res.status}): ${body}` });
  }
  const data = await res.json();
  return JSON.stringify(data, null, 0).slice(0, 8_000);
}

async function toolAdminPost(
  url: string,
  args: Record<string, string>,
  headers: Record<string, string>,
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    return JSON.stringify({ error: `Admin action failed (${res.status}): ${body}` });
  }
  return JSON.stringify(await res.json());
}

async function toolAdminCreateMember(
  args: Record<string, string>,
  wsBase: string,
  headers: Record<string, string>,
): Promise<string> {
  // Transform flat args into the expected shape
  const body = {
    name: args.name,
    title: args.title,
    specialization: args.specialization,
    teamId: args.teamId,
    isLead: String(args.isLead) === 'true',
    identity: {
      soul: args.soul,
      skills: typeof args.skills === 'string' ? JSON.parse(args.skills) : args.skills,
      memory: [],
    },
  };
  return toolAdminPost(`${wsBase}/members`, body as any, headers);
}

async function toolAdminPatch(
  url: string,
  args: Record<string, string>,
  excludeKeys: string[],
  headers: Record<string, string>,
): Promise<string> {
  const body: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) {
    if (!excludeKeys.includes(k)) body[k] = v;
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    return JSON.stringify({ error: `Admin action failed (${res.status}): ${body}` });
  }
  return JSON.stringify(await res.json());
}

async function toolAdminGet(
  url: string,
  params: Record<string, string>,
  headers: Record<string, string>,
): Promise<string> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const queryString = qs.toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  const res = await fetch(fullUrl, {
    signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
    headers,
  });
  if (!res.ok) {
    const body = await res.text();
    return JSON.stringify({ error: `GET failed (${res.status}): ${body}` });
  }
  const data = await res.json();
  return JSON.stringify(data, null, 0).slice(0, 8_000);
}

async function toolDelegateToKeros(
  message: string,
  wsBase: string,
  workspaceSlug: string,
  headers: Record<string, string>,
): Promise<string> {
  // Find Keros's conversation (look for system_keros agent DM)
  const convRes = await fetch(`${wsBase}/conversations`, {
    signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
    headers,
  });
  if (!convRes.ok) {
    return JSON.stringify({ error: `Failed to list conversations (${convRes.status})` });
  }
  const convs = await convRes.json() as Array<{ id: string; participantIds: string[] }>;
  const kerosConv = convs.find((c) => c.participantIds.some((p: string) => p.startsWith('system_keros')));
  if (!kerosConv) {
    return JSON.stringify({ error: 'Keros conversation not found. Is Keros configured in this workspace?' });
  }

  // Send the delegated message to Keros's conversation
  const sendRes = await fetch(`${wsBase}/conversations/${kerosConv.id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ content: `[Delegated from Mono] ${message}` }),
    signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
  });
  if (!sendRes.ok) {
    const body = await sendRes.text();
    return JSON.stringify({ error: `Failed to send delegation message (${sendRes.status}): ${body}` });
  }

  return JSON.stringify({
    success: true,
    message: `Delegated to Keros in conversation ${kerosConv.id}. Keros will handle the project management aspects.`,
  });
}

// ── LLM call with tool support ─────────────────────────────────────────────
interface LLMResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string;
  }>;
}

async function callLLM(
  messages: Message[],
  llmBaseUrl: string,
  llmModel: string,
  llmApiKey: string,
  tools: ToolDefinition[] | null,
): Promise<{ content: string | null; tool_calls?: ToolCall[] }> {
  const url = `${llmBaseUrl.replace(/\/$/, '')}/chat/completions`;

  const body: Record<string, unknown> = { model: llmModel, messages, stream: false };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(llmApiKey ? { Authorization: `Bearer ${llmApiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  if (!res.ok) {
    const respBody = await res.text();
    throw new Error(`LLM API ${res.status}: ${respBody}`);
  }

  const data = (await res.json()) as LLMResponse;
  const choice = data.choices?.[0]?.message;
  return {
    content: choice?.content ?? null,
    tool_calls: choice?.tool_calls,
  };
}

// ── Main (async IIFE to avoid top-level await) ─────────────────────────────
(async () => {
  const cwd = process.cwd();
  const configText = Bun.file(`${cwd}/config.toml`);
  const config = parseToml(await configText.text());

  const port = Number(config['gateway']?.port ?? ZEROCLAW_BASE_PORT);
  const host = config['gateway']?.host ?? '127.0.0.1';
  const agentMemberId = config['agent']?.id ?? '';
  const workspaceSlug = config['agent']?.workspace_slug ?? 'default';

  // Build system prompt from SOUL.md + FOUNDATION.md + AGENTS.md + SKILLS.md
  const parts: string[] = [];
  for (const file of ['SOUL.md', 'FOUNDATION.md', 'AGENTS.md', 'SKILLS.md']) {
    try {
      parts.push(await Bun.file(`${cwd}/${file}`).text());
    } catch {
      // File may not exist, skip
    }
  }
  const systemPrompt = parts.join('\n\n---\n\n') || 'You are a helpful AI assistant.';

  // LLM config: agent-specific env var (from config) → ZAI_API_KEY env → empty
  const apiKeyEnv = config['providers.custom']?.api_key_env ?? 'ZAI_API_KEY';
  const apiKey = process.env[apiKeyEnv] || process.env.ZAI_API_KEY || '';
  const baseUrl = process.env.ZAI_BASE_URL || config['providers.custom']?.base_url || DEFAULT_ZAI_BASE_URL;
  const model = process.env.ZAI_MODEL ?? config['provider']?.default_model ?? DEFAULT_ZAI_MODEL;
  const internalApiBase = `http://127.0.0.1:${API_PORT}/api`;
  const monkerosApiKey = process.env.MONOKEROS_API_KEY ?? '';
  const webhookSecret = process.env.ZEROCLAW_WEBHOOK_SECRET ?? '';
  const authHeaders: Record<string, string> = monkerosApiKey
    ? { Authorization: `Bearer ${monkerosApiKey}` }
    : {};

  function getHistory(conversationId: string): Message[] {
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, [{ role: 'system', content: systemPrompt }]);
    }
    return conversations.get(conversationId)!;
  }

  function addMessage(conversationId: string, msg: Message): void {
    const history = getHistory(conversationId);
    history.push(msg);
    // Trim to DAEMON_MAX_HISTORY (keep system prompt + last N messages)
    if (history.length > DAEMON_MAX_HISTORY + 1) {
      const system = history[0];
      const recent = history.slice(-(DAEMON_MAX_HISTORY));
      conversations.set(conversationId, [system, ...recent]);
    }
  }

  async function handleWebhook(req: Request): Promise<Response> {
    let body: { message?: string; conversation_id?: string; admin_context?: boolean };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const message = body.message;
    if (typeof message !== 'string' || !message.trim()) {
      return Response.json({ error: 'Missing message' }, { status: 400 });
    }

    const conversationId = body.conversation_id ?? 'default';
    const adminContext = body.admin_context === true;

    // Select tools based on agent type and admin context
    const isKeros = agentMemberId.startsWith('system_keros');
    const isMono = agentMemberId.startsWith('system_mono');

    const activeTools = [
      ...TOOL_DEFINITIONS,
      ...(adminContext ? ADMIN_TOOL_DEFINITIONS : []),
      ...(isKeros ? PM_TOOL_DEFINITIONS : []),
      ...(isMono ? DELEGATION_TOOL_DEFINITIONS : []),
    ];

    // When admin context is active, prepend a system-level note so the LLM
    // knows it has full workspace admin privileges for this request.
    const effectiveMessage = adminContext
      ? `[System: Admin context is active. You have full workspace admin privileges. Use your admin tools (create_team, create_member, update_team, create_project, update_workspace) freely when the user requests workspace changes.]\n\n${message}`
      : message;

    addMessage(conversationId, { role: 'user', content: effectiveMessage });

    // Stream NDJSON events during the tool-calling loop
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: { type: string; data: Record<string, unknown> }) => {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + '\n'));
        };

        try {
          let rounds = 0;
          while (rounds < MAX_TOOL_ROUNDS) {
            rounds++;

            emit({ type: 'status', data: { phase: 'thinking' } });

            const history = getHistory(conversationId);
            const result = await callLLM(history, baseUrl, model, apiKey, activeTools);

            if (result.tool_calls && result.tool_calls.length > 0) {
              addMessage(conversationId, {
                role: 'assistant',
                content: result.content ?? '',
                tool_calls: result.tool_calls,
              });

              for (const tc of result.tool_calls) {
                const toolArgs: Record<string, string> = {};
                try {
                  const parsed = JSON.parse(tc.function.arguments);
                  // Only include non-content args for display
                  for (const [k, v] of Object.entries(parsed)) {
                    if (k !== 'content' && typeof v === 'string') toolArgs[k] = v.slice(0, 200);
                  }
                } catch { /* ignore */ }

                emit({ type: 'tool_start', data: { id: tc.id, name: tc.function.name, args: toolArgs } });
                const startMs = Date.now();

                const toolResult = await executeToolCall(tc, baseUrl, apiKey, internalApiBase, authHeaders, agentMemberId, workspaceSlug);

                emit({ type: 'tool_end', data: { id: tc.id, name: tc.function.name, durationMs: Date.now() - startMs } });

                addMessage(conversationId, {
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: toolResult,
                });
              }

              // About to call LLM again with tool results
              emit({ type: 'status', data: { phase: 'reflecting' } });
              continue;
            }

            // No tool calls - final response
            const response = result.content ?? '';
            addMessage(conversationId, { role: 'assistant', content: response });

            // Stream response as accumulated paragraph content events
            const paragraphs = response.split(/\n\n+/).filter(Boolean);
            let accumulated = '';
            for (let i = 0; i < paragraphs.length; i++) {
              accumulated += (i > 0 ? '\n\n' : '') + paragraphs[i];
              emit({ type: 'content', data: { text: accumulated } });
            }

            emit({ type: 'done', data: { response } });
            controller.close();
            return;
          }

          // Exceeded max tool rounds
          const history = getHistory(conversationId);
          const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant' && 'content' in m && m.content);
          const response = (lastAssistant as { content: string } | undefined)?.content ?? 'I was unable to complete the request within the allowed tool usage limit.';
          emit({ type: 'done', data: { response } });
          controller.close();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          emit({ type: 'error', data: { message: errMsg } });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // ── HTTP Server ──────────────────────────────────────────────────────────
  Bun.serve({
    port,
    hostname: host,
    idleTimeout: 255, // Max value (seconds) — LLM calls can take >10s default
    fetch(req) {
      const url = new URL(req.url);

      if (req.method === 'GET' && url.pathname === '/health') {
        return Response.json({ status: 'ok' });
      }

      if (req.method === 'POST' && url.pathname === '/webhook') {
        // Verify webhook secret if configured
        if (webhookSecret) {
          const token = req.headers.get('x-webhook-secret');
          if (token !== webhookSecret) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }
        }
        return handleWebhook(req);
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  console.log(`ZeroClaw daemon listening on ${host}:${port}`);
})();
