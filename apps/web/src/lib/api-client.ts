import { API_PORT } from '@monokeros/constants';
import type {
  Member,
  Team,
  AgentRuntime,
  Project,
  Task,
  Notification,
  Conversation,
  ChatMessage,
  CreateConversationResponse,
  MessageReference,
  MessageAttachment,
  MessageReaction,
  WorkspaceMember,
  Workspace,
  DriveListing,
  MemberDrive,
  TeamDrive,
  ProjectDrive,
  WorkspaceDrive,
  FileEntry,
  CreateFileRequest,
  CreateFolderRequest,
  RenameRequest,
  UpdateFileRequest,
  CreateMemberInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
} from '@monokeros/types';
import type { TemplateListing, TemplateManifest } from '@monokeros/templates';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${API_PORT}/api`;

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getAuthHeaders(),
    ...init,
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Workspace-scoped path prefix */
function ws(slug: string) {
  return `/workspaces/${slug}`;
}

export const api = {
  // ── Non-scoped (auth + workspace listing) ─────────────
  workspaces: {
    list: () => fetcher<{ id: string; slug: string; displayName: string; role: string; branding: { logo: string | null; color: string }; industry: string }[]>('/workspaces'),
    create: (body: Record<string, unknown>) =>
      fetcher<Workspace & { role: string }>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    delete: (slug: string, confirmName: string) =>
      fetcher<{ success: boolean }>(`/workspaces/${slug}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmName }),
      }),
  },

  // ── Workspace-scoped resources (slug required) ────────
  members: {
    list: (slug: string) => fetcher<Member[]>(`${ws(slug)}/members`),
    detail: (slug: string, id: string) => fetcher<Member>(`${ws(slug)}/members/${id}`),
    updateStatus: (slug: string, id: string, status: string) =>
      fetcher<Member>(`${ws(slug)}/members/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    start: (slug: string, id: string) =>
      fetcher<AgentRuntime>(`${ws(slug)}/members/${id}/start`, { method: 'POST' }),
    stop: (slug: string, id: string) =>
      fetcher<{ success: boolean }>(`${ws(slug)}/members/${id}/stop`, { method: 'POST' }),
    runtime: (slug: string, id: string) =>
      fetcher<AgentRuntime>(`${ws(slug)}/members/${id}/runtime`),
    create: (slug: string, data: CreateMemberInput) =>
      fetcher<Member>(`${ws(slug)}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    avatarPreview: (slug: string, seed: string, teamId?: string, gender?: 1 | 2) => {
      const params = new URLSearchParams({ seed });
      if (teamId) params.set('teamId', teamId);
      if (gender) params.set('gender', String(gender));
      return fetcher<{ avatarUrl: string }>(`${ws(slug)}/members/avatar/preview?${params}`);
    },
    identityPreview: (slug: string, gender?: 1 | 2) => {
      const params = new URLSearchParams();
      if (gender) params.set('gender', String(gender));
      const qs = params.toString();
      return fetcher<{ firstName: string; gender: 1 | 2 }>(`${ws(slug)}/members/identity/preview${qs ? `?${qs}` : ''}`);
    },
    rerollName: (slug: string, id: string) =>
      fetcher<Member>(`${ws(slug)}/members/${id}/reroll-name`, { method: 'POST' }),
    rerollIdentity: (slug: string, id: string) =>
      fetcher<Member>(`${ws(slug)}/members/${id}/reroll-identity`, { method: 'POST' }),
  },
  teams: {
    list: (slug: string) => fetcher<Team[]>(`${ws(slug)}/teams`),
    detail: (slug: string, id: string) => fetcher<Team>(`${ws(slug)}/teams/${id}`),
  },
  projects: {
    list: (slug: string, params?: { status?: string; type?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.type) query.set('type', params.type);
      if (params?.search) query.set('search', params.search);
      const qs = query.toString();
      return fetcher<Project[]>(`${ws(slug)}/projects${qs ? `?${qs}` : ''}`);
    },
    detail: (slug: string, id: string) => fetcher<Project>(`${ws(slug)}/projects/${id}`),
    create: (slug: string, data: Partial<CreateProjectInput>) =>
      fetcher<Project>(`${ws(slug)}/projects`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (slug: string, id: string, data: Partial<UpdateProjectInput>) =>
      fetcher<Project>(`${ws(slug)}/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  tasks: {
    list: (slug: string, params?: { projectId?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.projectId) query.set('projectId', params.projectId);
      if (params?.status) query.set('status', params.status);
      const qs = query.toString();
      return fetcher<Task[]>(`${ws(slug)}/tasks${qs ? `?${qs}` : ''}`);
    },
    detail: (slug: string, id: string) => fetcher<Task>(`${ws(slug)}/tasks/${id}`),
    create: (slug: string, data: CreateTaskInput) =>
      fetcher<Task>(`${ws(slug)}/tasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    move: (slug: string, id: string, status: string) =>
      fetcher<Task>(`${ws(slug)}/tasks/${id}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    assign: (slug: string, id: string, assigneeIds: string[]) =>
      fetcher<Task>(`${ws(slug)}/tasks/${id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assigneeIds }),
      }),
    submitAcceptance: (slug: string, id: string, action: 'accept' | 'reject', feedback?: string) =>
      fetcher<Task>(`${ws(slug)}/tasks/${id}/acceptance`, {
        method: 'PATCH',
        body: JSON.stringify({ action, feedback }),
      }),
  },
  notifications: {
    list: (slug: string) => fetcher<Notification[]>(`${ws(slug)}/notifications`),
    counts: (slug: string) => fetcher<{ total: number; chat: number; files: number; org: number; projects: number }>(`${ws(slug)}/notifications/counts`),
    markRead: (slug: string, id: string) =>
      fetcher<Notification>(`${ws(slug)}/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: (slug: string) =>
      fetcher<{ count: number }>(`${ws(slug)}/notifications/read-all`, { method: 'PATCH' }),
  },
  conversations: {
    list: (slug: string) => fetcher<Conversation[]>(`${ws(slug)}/conversations`),
    detail: (slug: string, id: string) =>
      fetcher<Conversation & { messages: ChatMessage[] }>(`${ws(slug)}/conversations/${id}`),
    create: (slug: string, data: { participantIds: string[]; title?: string }) =>
      fetcher<CreateConversationResponse>(`${ws(slug)}/conversations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    rename: (slug: string, id: string, title: string) =>
      fetcher<Conversation>(`${ws(slug)}/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
    sendMessage: (slug: string, id: string, content: string, references?: MessageReference[]) =>
      fetcher<ChatMessage>(`${ws(slug)}/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, references }),
      }),
    setReaction: (slug: string, conversationId: string, messageId: string, emoji: string, reacted: boolean) =>
      fetcher<{ messageId: string; reactions: MessageReaction[] }>(`${ws(slug)}/conversations/${conversationId}/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji, reacted }),
      }),
    uploadAttachment: (slug: string, id: string, fileName: string, fileSize: number, mimeType?: string) =>
      fetcher<MessageAttachment>(`${ws(slug)}/conversations/${id}/attachments`, {
        method: 'POST',
        body: JSON.stringify({ fileName, fileSize, mimeType }),
      }),
  },
  workspaceMembers: {
    list: (slug: string) => fetcher<(WorkspaceMember & { member: Member })[]>(
      `${ws(slug)}/workspace-members`,
    ),
  },
  workspaceConfig: {
    get: (slug: string) => fetcher<Workspace>(`${ws(slug)}/config`),
    update: (slug: string, data: Record<string, unknown>) =>
      fetcher<Workspace>(`${ws(slug)}/config`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  files: {
    drives: (slug: string) => fetcher<DriveListing>(`${ws(slug)}/files/drives`),
    memberDrive: (slug: string, memberId: string) =>
      fetcher<MemberDrive>(`${ws(slug)}/files/members/${memberId}`),
    teamDrive: (slug: string, teamId: string) =>
      fetcher<TeamDrive>(`${ws(slug)}/files/teams/${teamId}`),
    projectDrive: (slug: string, projectId: string) =>
      fetcher<ProjectDrive>(`${ws(slug)}/files/projects/${projectId}`),
    workspaceDrive: (slug: string) =>
      fetcher<WorkspaceDrive>(`${ws(slug)}/files/workspace`),
    memberFile: (slug: string, memberId: string, path: string) =>
      fetcher<FileEntry & { content: string }>(
        `${ws(slug)}/files/members/${memberId}/file?path=${encodeURIComponent(path)}`,
      ),
    teamFile: (slug: string, teamId: string, path: string) =>
      fetcher<FileEntry & { content: string }>(
        `${ws(slug)}/files/teams/${teamId}/file?path=${encodeURIComponent(path)}`,
      ),
    projectFile: (slug: string, projectId: string, path: string) =>
      fetcher<FileEntry & { content: string }>(
        `${ws(slug)}/files/projects/${projectId}/file?path=${encodeURIComponent(path)}`,
      ),
    workspaceFile: (slug: string, path: string) =>
      fetcher<FileEntry & { content: string }>(
        `${ws(slug)}/files/workspace/file?path=${encodeURIComponent(path)}`,
      ),
    fileContent: (slug: string, category: string, ownerId: string, path: string) =>
      fetcher<FileEntry & { content: string }>(
        `${ws(slug)}/files/${category}/${ownerId}/file?path=${encodeURIComponent(path)}`,
      ),
    createFile: (slug: string, category: string, ownerId: string, dir: string, body: CreateFileRequest) =>
      fetcher<FileEntry>(`${ws(slug)}/files/${category}/${ownerId}/file?dir=${encodeURIComponent(dir)}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    createFolder: (slug: string, category: string, ownerId: string, dir: string, body: CreateFolderRequest) =>
      fetcher<FileEntry>(`${ws(slug)}/files/${category}/${ownerId}/folder?dir=${encodeURIComponent(dir)}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    renameItem: (slug: string, category: string, ownerId: string, path: string, body: RenameRequest) =>
      fetcher<FileEntry>(`${ws(slug)}/files/${category}/${ownerId}/rename?path=${encodeURIComponent(path)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    updateContent: (slug: string, category: string, ownerId: string, path: string, body: UpdateFileRequest) =>
      fetcher<FileEntry & { content: string }>(`${ws(slug)}/files/${category}/${ownerId}/content?path=${encodeURIComponent(path)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    deleteItem: (slug: string, category: string, ownerId: string, path: string) =>
      fetcher<{ success: boolean }>(`${ws(slug)}/files/${category}/${ownerId}/item?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      }),
  },
  render: {
    markdown: (slug: string, content: string) =>
      fetcher<{ html: string; hasMermaid: boolean; hasMath: boolean }>(`${ws(slug)}/render/markdown`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    file: (slug: string, content: string, fileName: string) =>
      fetcher<{ html: string }>(`${ws(slug)}/render/file`, {
        method: 'POST',
        body: JSON.stringify({ content, fileName }),
      }),
  },

  // ── Documentation (non-scoped, public) ──────────────────
  docs: {
    nav: () => fetcher<{ title: string; sections: { title: string; items: { title: string; path: string }[] }[] }>('/docs/nav'),
    page: (path: string) => fetcher<{ html: string; hasMermaid: boolean; hasMath: boolean; title: string }>(`/docs/page?path=${encodeURIComponent(path)}`),
  },

  // ── Templates (non-scoped) ─────────────────────────────
  templates: {
    list: (category?: string) =>
      fetcher<TemplateListing[]>(`/templates${category ? `?category=${category}` : ''}`),
    detail: (id: string) => fetcher<TemplateManifest>(`/templates/${id}`),
    apply: (id: string, body: {
      slug: string;
      displayName: string;
      branding?: { color: string; logo?: string };
      description?: string;
      includeAgents?: string[];
      includeTeams?: string[];
    }) =>
      fetcher<Workspace & { role: string }>(`/templates/${id}/apply`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
};
