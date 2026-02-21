import { API_PORT, API_REQUEST_TIMEOUT_MS, MESSAGE_SEND_TIMEOUT_MS } from '@monokeros/constants';
import type {
  Member,
  Team,
  Project,
  Task,
  Conversation,
  ChatMessage,
  DriveListing,
  FileEntry,
  CreateConversationResponse,
  AgentRuntime,
  Workspace,
  ProviderConfig,
} from '@monokeros/types';

const BASE = `http://localhost:${API_PORT}/api`;

export class ApiClient {
  private apiKey: string | null = null;
  private workspaceSlug: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  setWorkspace(slug: string) {
    this.workspaceSlug = slug;
  }

  /** Workspace-scoped path prefix */
  private ws(): string {
    if (!this.workspaceSlug) throw new Error('No workspace configured. Set MONOKEROS_WORKSPACE env var.');
    return `/workspaces/${this.workspaceSlug}`;
  }

  private async request<T>(path: string, init?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout, ...fetchInit } = init ?? {};
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchInit.headers as Record<string, string>),
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${BASE}${path}`, {
      ...fetchInit,
      headers,
      signal: AbortSignal.timeout(timeout ?? API_REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  // ── Workspaces (non-scoped) ─────────────────────────────

  async listWorkspaces(): Promise<{ id: string; slug: string; displayName: string; role: string }[]> {
    return this.request('/workspaces');
  }

  // ── Members ───────────────────────────────────────────

  async listMembers(): Promise<Member[]> {
    return this.request(`${this.ws()}/members`);
  }

  async getMember(id: string): Promise<Member> {
    return this.request(`${this.ws()}/members/${id}`);
  }

  async createMember(body: Record<string, unknown>): Promise<Member> {
    return this.request(`${this.ws()}/members`, { method: 'POST', body: JSON.stringify(body) });
  }

  async updateMember(id: string, body: Record<string, unknown>): Promise<Member> {
    return this.request(`${this.ws()}/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async updateMemberStatus(id: string, status: string): Promise<Member> {
    return this.request(`${this.ws()}/members/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async startAgent(id: string): Promise<AgentRuntime> {
    return this.request(`${this.ws()}/members/${id}/start`, { method: 'POST' });
  }

  async stopAgent(id: string): Promise<{ success: boolean }> {
    return this.request(`${this.ws()}/members/${id}/stop`, { method: 'POST' });
  }

  async getMemberRuntime(id: string): Promise<AgentRuntime> {
    return this.request(`${this.ws()}/members/${id}/runtime`);
  }

  async rerollMemberName(id: string): Promise<Member> {
    return this.request(`${this.ws()}/members/${id}/reroll-name`, { method: 'POST' });
  }

  async rerollMemberIdentity(id: string): Promise<Member> {
    return this.request(`${this.ws()}/members/${id}/reroll-identity`, { method: 'POST' });
  }

  // ── Teams ─────────────────────────────────────────────

  async listTeams(): Promise<Team[]> {
    return this.request(`${this.ws()}/teams`);
  }

  async getTeam(id: string): Promise<Team & { members: Member[] }> {
    return this.request(`${this.ws()}/teams/${id}`);
  }

  async createTeam(body: Record<string, unknown>): Promise<Team> {
    return this.request(`${this.ws()}/teams`, { method: 'POST', body: JSON.stringify(body) });
  }

  async updateTeam(id: string, body: Record<string, unknown>): Promise<Team> {
    return this.request(`${this.ws()}/teams/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async deleteTeam(id: string): Promise<{ success: boolean }> {
    return this.request(`${this.ws()}/teams/${id}`, { method: 'DELETE' });
  }

  // ── Projects ──────────────────────────────────────────

  async listProjects(params?: {
    status?: string;
    type?: string;
    search?: string;
  }): Promise<Project[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString();
    return this.request(`${this.ws()}/projects${query ? `?${query}` : ''}`);
  }

  async getProject(id: string): Promise<Project> {
    return this.request(`${this.ws()}/projects/${id}`);
  }

  async createProject(body: Record<string, unknown>): Promise<Project> {
    return this.request(`${this.ws()}/projects`, { method: 'POST', body: JSON.stringify(body) });
  }

  async updateProject(id: string, body: Record<string, unknown>): Promise<Project> {
    return this.request(`${this.ws()}/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async updateGate(
    projectId: string,
    body: Record<string, unknown>,
  ): Promise<Project> {
    return this.request(`${this.ws()}/projects/${projectId}/gate`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // ── Tasks ─────────────────────────────────────────────

  async listTasks(params?: {
    projectId?: string;
    status?: string;
    assigneeId?: string;
  }): Promise<Task[]> {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', params.projectId);
    if (params?.status) qs.set('status', params.status);
    if (params?.assigneeId) qs.set('assigneeId', params.assigneeId);
    const query = qs.toString();
    return this.request(`${this.ws()}/tasks${query ? `?${query}` : ''}`);
  }

  async getTask(id: string): Promise<Task> {
    return this.request(`${this.ws()}/tasks/${id}`);
  }

  async createTask(body: Record<string, unknown>): Promise<Task> {
    return this.request(`${this.ws()}/tasks`, { method: 'POST', body: JSON.stringify(body) });
  }

  async updateTask(id: string, body: Record<string, unknown>): Promise<Task> {
    return this.request(`${this.ws()}/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async moveTask(id: string, status: string): Promise<Task> {
    return this.request(`${this.ws()}/tasks/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async assignTask(id: string, assigneeIds: string[]): Promise<Task> {
    return this.request(`${this.ws()}/tasks/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigneeIds }),
    });
  }

  // ── Conversations ─────────────────────────────────────

  async listConversations(): Promise<Conversation[]> {
    return this.request(`${this.ws()}/conversations`);
  }

  async getConversation(
    id: string,
  ): Promise<Conversation & { messages: ChatMessage[] }> {
    return this.request(`${this.ws()}/conversations/${id}`);
  }

  async createConversation(body: {
    participantIds: string[];
    title?: string;
  }): Promise<CreateConversationResponse> {
    return this.request(`${this.ws()}/conversations`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async renameConversation(id: string, title: string): Promise<Conversation> {
    return this.request(`${this.ws()}/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async sendMessage(
    conversationId: string,
    content: string,
    references?: Array<{ type: string; id: string; display: string }>,
  ): Promise<ChatMessage> {
    return this.request(`${this.ws()}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, references: references ?? [] }),
      timeout: MESSAGE_SEND_TIMEOUT_MS,
    });
  }

  // ── Files ─────────────────────────────────────────────

  async listDrives(): Promise<DriveListing> {
    return this.request(`${this.ws()}/files/drives`);
  }

  async readFile(
    category: string,
    ownerId: string,
    path: string,
  ): Promise<FileEntry & { content: string }> {
    const qs = new URLSearchParams({ path });
    if (category === 'workspace') {
      return this.request(`${this.ws()}/files/workspace/file?${qs}`);
    }
    return this.request(`${this.ws()}/files/${category}/${ownerId}/file?${qs}`);
  }

  async createFile(
    category: string,
    ownerId: string,
    body: { name: string; extension?: string; content?: string },
    dir?: string,
  ): Promise<FileEntry> {
    const qs = new URLSearchParams();
    if (dir) qs.set('dir', dir);
    const query = qs.toString();
    return this.request(
      `${this.ws()}/files/${category}/${ownerId}/file${query ? `?${query}` : ''}`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async updateFile(
    category: string,
    ownerId: string,
    path: string,
    content: string,
  ): Promise<FileEntry & { content: string }> {
    const qs = new URLSearchParams({ path });
    return this.request(`${this.ws()}/files/${category}/${ownerId}/content?${qs}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  async renameFile(
    category: string,
    ownerId: string,
    path: string,
    newName: string,
  ): Promise<FileEntry> {
    const qs = new URLSearchParams({ path });
    return this.request(`${this.ws()}/files/${category}/${ownerId}/rename?${qs}`, {
      method: 'PATCH',
      body: JSON.stringify({ newName }),
    });
  }

  async createFolder(
    category: string,
    ownerId: string,
    name: string,
    dir?: string,
  ): Promise<FileEntry> {
    const qs = new URLSearchParams();
    if (dir) qs.set('dir', dir);
    const query = qs.toString();
    return this.request(
      `${this.ws()}/files/${category}/${ownerId}/folder${query ? `?${query}` : ''}`,
      { method: 'POST', body: JSON.stringify({ name }) },
    );
  }

  async deleteFile(
    category: string,
    ownerId: string,
    path: string,
  ): Promise<{ success: boolean }> {
    const qs = new URLSearchParams({ path });
    return this.request(`${this.ws()}/files/${category}/${ownerId}/item?${qs}`, {
      method: 'DELETE',
    });
  }

  // ── Knowledge ──────────────────────────────────────────

  async searchKnowledge(
    query: string,
    memberId: string,
    scopes?: string,
    maxResults?: number,
  ): Promise<unknown[]> {
    const qs = new URLSearchParams({ query, memberId });
    if (scopes) qs.set('scopes', scopes);
    if (maxResults) qs.set('maxResults', String(maxResults));
    return this.request(`${this.ws()}/knowledge/search?${qs}`);
  }

  // ── Workspace Config ───────────────────────────────────

  async getWorkspace(): Promise<Workspace> {
    return this.request(`${this.ws()}/config`);
  }

  async updateWorkspace(body: Record<string, unknown>): Promise<Workspace> {
    return this.request(`${this.ws()}/config`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // ── Workspace Providers ──────────────────────────────

  async getWorkspaceProviders(): Promise<ProviderConfig[]> {
    return this.request(`${this.ws()}/config/providers`);
  }

  async addWorkspaceProvider(body: Record<string, unknown>): Promise<ProviderConfig> {
    return this.request(`${this.ws()}/config/providers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateWorkspaceProvider(provider: string, body: Record<string, unknown>): Promise<ProviderConfig> {
    return this.request(`${this.ws()}/config/providers/${provider}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async removeWorkspaceProvider(provider: string): Promise<{ success: boolean }> {
    return this.request(`${this.ws()}/config/providers/${provider}`, { method: 'DELETE' });
  }

  async setDefaultProvider(provider: string): Promise<{ defaultProviderId: string }> {
    return this.request(`${this.ws()}/config/default-provider`, {
      method: 'PATCH',
      body: JSON.stringify({ defaultProviderId: provider }),
    });
  }

  // ── Agent Runtimes ────────────────────────────────────

  async listAgentRuntimes(): Promise<AgentRuntime[]> {
    const members = await this.listMembers();
    const agents = members.filter((m) => m.type === 'agent');
    const runtimes = await Promise.all(
      agents.map((a) =>
        this.getMemberRuntime(a.id).catch(() => ({
          memberId: a.id,
          socketPath: null,
          pid: null,
          status: 'stopped' as const,
          lastHealthCheck: null,
        })),
      ),
    );
    return runtimes as AgentRuntime[];
  }
}
