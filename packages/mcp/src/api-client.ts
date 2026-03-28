import { API_REQUEST_TIMEOUT_MS, MESSAGE_SEND_TIMEOUT_MS } from "@monokeros/constants";
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
  Notification,
  NotificationCounts,
  TokenUsage,
  ResourceSnapshot,
  ContainerStats,
  DesktopSession,
  ActivityEntry,
  WikiNavItem,
  WikiPage,
  TemplateInfo,
  TemplateApplyResult,
  ProviderInfo,
  ModelCatalog,
} from "@monokeros/types";

// The MCP server connects to Convex's HTTP endpoint.
// Inside Docker containers, MONOKEROS_API_URL should point to the Convex site
// origin (e.g., http://host.docker.internal:3211).
const BASE = process.env.MONOKEROS_API_URL ?? "http://localhost:3211";

export class ApiClient {
  private apiKey: string | null = null;
  private workspaceSlug: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  setWorkspace(slug: string) {
    this.workspaceSlug = slug;
  }

  /** Send an RPC call to the /api/mcp dispatch endpoint. */
  private async call<T>(action: string, args?: Record<string, unknown>, timeout?: number): Promise<T> {
    if (!this.workspaceSlug) {
      throw new Error("No workspace configured. Set MONOKEROS_WORKSPACE env var.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${BASE}/api/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action,
        args: { ...args, workspaceSlug: this.workspaceSlug },
      }),
      signal: AbortSignal.timeout(timeout ?? API_REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MCP API ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Workspaces ─────────────────────────────────────────

  async listWorkspaces(): Promise<
    { id: string; slug: string; displayName: string; role: string }[]
  > {
    return this.call("workspaces.list");
  }

  // ── Members ───────────────────────────────────────────

  async listMembers(): Promise<Member[]> {
    return this.call("members.list");
  }

  async getMember(id: string): Promise<Member> {
    return this.call("members.get", { memberId: id });
  }

  async createMember(body: Record<string, unknown>): Promise<Member> {
    return this.call("members.create", body);
  }

  async updateMember(id: string, body: Record<string, unknown>): Promise<Member> {
    return this.call("members.update", { memberId: id, ...body });
  }

  async updateMemberStatus(
    id: string,
    status: string,
    opts?: { currentTaskId?: string | null; currentProjectId?: string | null },
  ): Promise<Member> {
    return this.call("members.updateStatus", { memberId: id, status, ...opts });
  }

  async startAgent(id: string): Promise<AgentRuntime> {
    return this.call("members.startContainer", { memberId: id });
  }

  async stopAgent(id: string): Promise<{ success: boolean }> {
    return this.call("members.stopContainer", { memberId: id });
  }

  async getMemberRuntime(id: string): Promise<AgentRuntime> {
    return this.call("members.getRuntime", { memberId: id });
  }

  async rerollMemberName(id: string): Promise<Member> {
    return this.call("members.rerollName", { memberId: id });
  }

  async rerollMemberIdentity(id: string): Promise<Member> {
    return this.call("members.rerollIdentity", { memberId: id });
  }

  async deleteMember(id: string): Promise<{ success: boolean }> {
    return this.call("members.remove", { memberId: id });
  }

  async restartAgent(id: string): Promise<AgentRuntime> {
    return this.call("members.restartContainer", { memberId: id });
  }

  async getAgentDesktop(id: string): Promise<{ vncPort: number; status: string } | null> {
    return this.call("members.getDesktop", { memberId: id });
  }

  async getAgentStats(id: string): Promise<ContainerStats> {
    return this.call("members.getContainerStats", { memberId: id });
  }

  async createDesktopSession(
    id: string,
    interactive?: boolean,
  ): Promise<DesktopSession> {
    return this.call("members.createDesktopSession", { memberId: id, interactive });
  }

  // ── Teams ─────────────────────────────────────────────

  async listTeams(): Promise<Team[]> {
    return this.call("teams.list");
  }

  async getTeam(id: string): Promise<Team & { members: Member[] }> {
    return this.call("teams.get", { teamId: id });
  }

  async createTeam(body: Record<string, unknown>): Promise<Team> {
    return this.call("teams.create", body);
  }

  async updateTeam(id: string, body: Record<string, unknown>): Promise<Team> {
    return this.call("teams.update", { teamId: id, ...body });
  }

  async deleteTeam(id: string): Promise<{ success: boolean }> {
    return this.call("teams.remove", { teamId: id });
  }

  // ── Projects ──────────────────────────────────────────

  async listProjects(params?: {
    status?: string;
    type?: string;
    search?: string;
  }): Promise<Project[]> {
    return this.call("projects.list", params);
  }

  async getProject(id: string): Promise<Project> {
    return this.call("projects.get", { projectId: id });
  }

  async createProject(body: Record<string, unknown>): Promise<Project> {
    return this.call("projects.create", body);
  }

  async updateProject(id: string, body: Record<string, unknown>): Promise<Project> {
    return this.call("projects.update", { projectId: id, ...body });
  }

  async updateGate(projectId: string, body: Record<string, unknown>): Promise<Project> {
    return this.call("projects.updateGate", { projectId, ...body });
  }

  // ── Tasks ─────────────────────────────────────────────

  async listTasks(params?: {
    projectId?: string;
    status?: string;
    assigneeId?: string;
  }): Promise<Task[]> {
    return this.call("tasks.list", params);
  }

  async getTask(id: string): Promise<Task> {
    return this.call("tasks.get", { taskId: id });
  }

  async createTask(body: Record<string, unknown>): Promise<Task> {
    return this.call("tasks.create", body);
  }

  async updateTask(id: string, body: Record<string, unknown>): Promise<Task> {
    return this.call("tasks.update", { taskId: id, ...body });
  }

  async moveTask(id: string, status: string): Promise<Task> {
    return this.call("tasks.move", { taskId: id, status });
  }

  async assignTask(id: string, assigneeIds: string[]): Promise<Task> {
    return this.call("tasks.assign", { taskId: id, assigneeIds });
  }

  async setTaskParent(taskId: string, parentId: string | null): Promise<void> {
    return this.call("tasks.setParent", { taskId, parentId });
  }

  async addTaskDependency(taskId: string, dependencyId: string): Promise<void> {
    return this.call("tasks.addDependency", { taskId, dependencyId });
  }

  async removeTaskDependency(taskId: string, dependencyId: string): Promise<void> {
    return this.call("tasks.removeDependency", { taskId, dependencyId });
  }

  async addTaskArtifact(
    taskId: string,
    field: "inputs" | "outputs",
    artifact: { type: string; label: string; path?: string; url?: string },
  ): Promise<void> {
    return this.call("tasks.addArtifact", { taskId, field, artifact });
  }

  async removeTaskArtifact(
    taskId: string,
    field: "inputs" | "outputs",
    artifactId: string,
  ): Promise<void> {
    return this.call("tasks.removeArtifact", { taskId, field, artifactId });
  }

  async submitTaskAcceptance(
    taskId: string,
    action: "accept" | "reject",
    feedback?: string,
  ): Promise<Task> {
    return this.call("tasks.submitAcceptance", { taskId, action, feedback });
  }

  // ── Conversations ─────────────────────────────────────

  async listConversations(): Promise<Conversation[]> {
    return this.call("conversations.list");
  }

  async getConversation(id: string): Promise<Conversation & { messages: ChatMessage[] }> {
    return this.call("conversations.get", { conversationId: id });
  }

  async createConversation(body: {
    participantIds: string[];
    title?: string;
  }): Promise<CreateConversationResponse> {
    return this.call("conversations.create", body);
  }

  async renameConversation(id: string, title: string): Promise<Conversation> {
    return this.call("conversations.rename", { conversationId: id, title });
  }

  async sendMessage(
    conversationId: string,
    content: string,
    references?: Array<{ type: string; id: string; display: string }>,
  ): Promise<ChatMessage> {
    return this.call(
      "conversations.sendMessage",
      { conversationId, content, references: references ?? [] },
      MESSAGE_SEND_TIMEOUT_MS,
    );
  }

  async setMessageReaction(messageId: string, emoji: string): Promise<void> {
    return this.call("conversations.setReaction", { messageId, emoji });
  }

  // ── Files ─────────────────────────────────────────────

  async listDrives(): Promise<DriveListing> {
    return this.call("files.drives");
  }

  async readFile(
    category: string,
    ownerId: string,
    path: string,
  ): Promise<FileEntry & { content: string }> {
    return this.call("files.getContent", { driveType: category, driveOwnerId: ownerId, path });
  }

  async createFile(
    category: string,
    ownerId: string,
    body: { name: string; extension?: string; content?: string },
    dir?: string,
  ): Promise<FileEntry> {
    return this.call("files.createFile", {
      driveType: category,
      driveOwnerId: ownerId,
      ...body,
      ...(dir && { dir }),
    });
  }

  async updateFile(
    category: string,
    ownerId: string,
    path: string,
    content: string,
  ): Promise<FileEntry & { content: string }> {
    return this.call("files.updateContent", {
      driveType: category,
      driveOwnerId: ownerId,
      path,
      content,
    });
  }

  async renameFile(
    category: string,
    ownerId: string,
    path: string,
    newName: string,
  ): Promise<FileEntry> {
    return this.call("files.renameItem", {
      driveType: category,
      driveOwnerId: ownerId,
      path,
      newName,
    });
  }

  async createFolder(
    category: string,
    ownerId: string,
    name: string,
    dir?: string,
  ): Promise<FileEntry> {
    return this.call("files.createFolder", {
      driveType: category,
      driveOwnerId: ownerId,
      name,
      ...(dir && { dir }),
    });
  }

  async deleteFile(category: string, ownerId: string, path: string): Promise<{ success: boolean }> {
    return this.call("files.deleteItem", {
      driveType: category,
      driveOwnerId: ownerId,
      path,
    });
  }

  // ── Knowledge ──────────────────────────────────────────

  async searchKnowledge(
    query: string,
    memberId: string,
    scopes?: string,
    maxResults?: number,
  ): Promise<unknown[]> {
    return this.call("knowledge.search", {
      query,
      memberId,
      ...(scopes && { scopes }),
      ...(maxResults && { maxResults }),
    });
  }

  // ── Workspace Config ───────────────────────────────────

  async getWorkspace(): Promise<Workspace> {
    return this.call("workspaces.getConfig");
  }

  async updateWorkspace(body: Record<string, unknown>): Promise<Workspace> {
    return this.call("workspaces.updateConfig", body);
  }

  // ── Workspace Providers ──────────────────────────────

  async getWorkspaceProviders(): Promise<ProviderConfig[]> {
    return this.call("workspaces.listProviders");
  }

  async addWorkspaceProvider(body: Record<string, unknown>): Promise<ProviderConfig> {
    return this.call("workspaces.addProvider", body);
  }

  async updateWorkspaceProvider(
    provider: string,
    body: Record<string, unknown>,
  ): Promise<ProviderConfig> {
    return this.call("workspaces.updateProvider", { provider, ...body });
  }

  async removeWorkspaceProvider(provider: string): Promise<{ success: boolean }> {
    return this.call("workspaces.removeProvider", { provider });
  }

  async setDefaultProvider(provider: string): Promise<{ defaultProviderId: string }> {
    return this.call("workspaces.setDefaultProvider", { defaultProviderId: provider });
  }

  async createWorkspace(body: {
    name: string;
    displayName: string;
    slug: string;
    description?: string;
    industry: string;
    industrySubtype?: string;
  }): Promise<Workspace> {
    return this.call("workspaces.create", body);
  }

  async deleteWorkspace(confirmName: string): Promise<{ success: boolean }> {
    return this.call("workspaces.remove", { confirmName });
  }

  // ── Notifications ──────────────────────────────────────

  async listNotifications(): Promise<Notification[]> {
    return this.call("notifications.list");
  }

  async getNotificationCounts(): Promise<NotificationCounts> {
    return this.call("notifications.counts");
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    return this.call("notifications.markRead", { notificationId });
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.call("notifications.markAllRead");
  }

  // ── Models ─────────────────────────────────────────────

  async getModelProviders(): Promise<ProviderInfo[]> {
    return this.call("models.providers");
  }

  async getModelCatalog(search?: string): Promise<ModelCatalog> {
    return this.call("models.catalog", search ? { search } : undefined);
  }

  // ── Token Usage ────────────────────────────────────────

  async getMemberTokenUsage(memberId: string, limit?: number): Promise<TokenUsage[]> {
    return this.call("tokenUsage.getByMember", { memberId, ...(limit && { limit }) });
  }

  async getConversationTokenUsage(conversationId: string, limit?: number): Promise<TokenUsage[]> {
    return this.call("tokenUsage.getByConversation", { conversationId, ...(limit && { limit }) });
  }

  // ── Resource Snapshots ─────────────────────────────────

  async getMemberResourceSnapshots(memberId: string, limit?: number): Promise<ResourceSnapshot[]> {
    return this.call("resourceSnapshots.getByMember", { memberId, ...(limit && { limit }) });
  }

  // ── Activities ─────────────────────────────────────────

  async getActivityFeed(limit?: number): Promise<ActivityEntry[]> {
    return this.call("activities.feed", limit ? { limit } : undefined);
  }

  // ── Wiki ───────────────────────────────────────────────

  async getWikiNav(): Promise<WikiNavItem[]> {
    return this.call("wiki.nav");
  }

  async getWikiPage(path: string): Promise<WikiPage | null> {
    return this.call("wiki.page", { path });
  }

  async getWikiRaw(path: string): Promise<string | null> {
    return this.call("wiki.raw", { path });
  }

  async saveWikiPage(
    path: string,
    content: string,
    title?: string,
  ): Promise<{ id: string }> {
    return this.call("wiki.save", { path, content, ...(title && { title }) });
  }

  // ── Templates ──────────────────────────────────────────

  async listTemplates(): Promise<TemplateInfo[]> {
    return this.call("templates.list");
  }

  async getTemplate(templateId: string): Promise<TemplateInfo> {
    return this.call("templates.get", { templateId });
  }

  async applyTemplate(body: {
    templateId: string;
    workspaceName: string;
    slug: string;
    displayName: string;
  }): Promise<TemplateApplyResult> {
    return this.call("templates.apply", body);
  }

  // ── Agent Runtimes ────────────────────────────────────

  async listAgentRuntimes(): Promise<AgentRuntime[]> {
    const members = await this.listMembers();
    const agents = members.filter((m) => m.type === "agent");
    const runtimes = await Promise.all(
      agents.map((a) =>
        this.getMemberRuntime(a.id).catch(() => ({
          memberId: a.id,
          socketPath: null,
          pid: null,
          status: "stopped" as const,
          lastHealthCheck: null,
        })),
      ),
    );
    return runtimes as AgentRuntime[];
  }
}
