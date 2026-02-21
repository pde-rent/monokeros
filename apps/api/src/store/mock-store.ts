import { Injectable } from '@nestjs/common';
import { Member, Team, Project, Task, Conversation, ChatMessage, Workspace, WorkspaceMember, ApiKey, AiProvider, MessageReaction } from '@monokeros/types';
import type { Notification, ProviderConfig } from '@monokeros/types';
import type { Permission } from '@monokeros/types';
import { DEFAULT_AGENT_PERMISSIONS, PERMISSIONS } from '@monokeros/constants';
import {
  members as memberFixtures,
  teams as teamFixtures,
  projects as projectFixtures,
  tasks as taskFixtures,
  conversations as conversationFixtures,
  messages as messageFixtures,
  workspaces as workspaceFixtures,
  workspaceMembers as workspaceMemberFixtures,
  notifications as notificationFixtures,
} from '@monokeros/mock-data';

@Injectable()
export class MockStore {
  members = new Map<string, Member>();
  teams = new Map<string, Team>();
  projects = new Map<string, Project>();
  tasks = new Map<string, Task>();
  conversations = new Map<string, Conversation>();
  messages = new Map<string, ChatMessage>();
  workspaces = new Map<string, Workspace>();
  workspaceMembers = new Map<string, WorkspaceMember>();
  apiKeys = new Map<string, ApiKey>();
  notifications = new Map<string, Notification>();

  constructor() {
    this.seed();
  }

  private seedMap<T extends { id: string }>(map: Map<string, T>, fixtures: T[]) {
    fixtures.forEach((item) => map.set(item.id, { ...item }));
  }

  private seed() {
    this.seedMap(this.members, memberFixtures);
    this.seedMap(this.teams, teamFixtures);
    this.seedMap(this.projects, projectFixtures);
    this.seedMap(this.tasks, taskFixtures);
    this.seedMap(this.conversations, conversationFixtures);
    this.seedMap(this.messages, messageFixtures);
    this.seedMap(this.workspaces, workspaceFixtures);
    this.seedMap(this.workspaceMembers, workspaceMemberFixtures);
    this.seedMap(this.notifications, notificationFixtures);
    this.seedApiKeys();
  }

  private seedApiKeys() {
    const agents = this.getAgentMembers();
    for (const agent of agents) {
      const rawKey = `mk_dev_${agent.id}`;
      let permissions: Permission[];
      if (agent.system) {
        permissions = ['*'];
      } else if (agent.id === 'agent_pm_lead') {
        permissions = [...DEFAULT_AGENT_PERMISSIONS, PERMISSIONS.projects.write, PERMISSIONS.projects.manage];
      } else {
        permissions = DEFAULT_AGENT_PERMISSIONS;
      }
      const apiKey: ApiKey = {
        id: `apikey_${agent.id}`,
        key: rawKey, // dev mode: store raw key directly, skip hashing
        prefix: rawKey.slice(0, 11) + '...',
        memberId: agent.id,
        workspaceId: 'ws_01',
        name: `${agent.name} daemon key`,
        permissions,
        createdAt: '2025-10-01T00:00:00Z',
        lastUsedAt: null,
        expiresAt: null,
        revoked: false,
      };
      this.apiKeys.set(apiKey.id, apiKey);
    }
  }

  /** Generic filter: returns all values from a map that match the predicate. */
  filterBy<T>(map: Map<string, T>, predicate: (item: T) => boolean): T[] {
    return Array.from(map.values()).filter(predicate);
  }

  getMessagesByConversation(conversationId: string, limit?: number, offset?: number): ChatMessage[] {
    const all = this.filterBy(this.messages, (m) => m.conversationId === conversationId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (limit == null) return all;
    return all.slice(offset ?? 0, (offset ?? 0) + limit);
  }

  getMessageCountByConversation(conversationId: string): number {
    let count = 0;
    for (const m of this.messages.values()) {
      if (m.conversationId === conversationId) count++;
    }
    return count;
  }

  getMembersByTeam(teamId: string): Member[] {
    return this.filterBy(this.members, (m) => m.teamId === teamId);
  }

  getHumanMembers(): Member[] {
    return this.filterBy(this.members, (m) => m.type === 'human');
  }

  getAgentMembers(): Member[] {
    return this.filterBy(this.members, (m) => m.type === 'agent');
  }

  getApiKeyByHash(hash: string): ApiKey | undefined {
    return Array.from(this.apiKeys.values()).find(
      (k) => k.key === hash && !k.revoked,
    );
  }

  getApiKeysByMember(memberId: string): ApiKey[] {
    return this.filterBy(this.apiKeys, (k) => k.memberId === memberId);
  }

  getWorkspaceMemberByMemberId(memberId: string): WorkspaceMember | undefined {
    for (const wm of this.workspaceMembers.values()) {
      if (wm.memberId === memberId) return wm;
    }
    return undefined;
  }

  // ── Provider Management ────────────────────────────

  getWorkspaceProviders(workspaceId: string): ProviderConfig[] {
    const ws = this.workspaces.get(workspaceId);
    return ws?.providers ?? [];
  }

  getWorkspaceProvider(workspaceId: string, provider: AiProvider): ProviderConfig | undefined {
    return this.getWorkspaceProviders(workspaceId).find((p) => p.provider === provider);
  }

  addProvider(workspaceId: string, config: ProviderConfig): ProviderConfig {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) throw new Error(`Workspace ${workspaceId} not found`);
    ws.providers = ws.providers.filter((p) => p.provider !== config.provider);
    ws.providers.push(config);
    return config;
  }

  updateProvider(workspaceId: string, provider: AiProvider, updates: Partial<ProviderConfig>): ProviderConfig {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) throw new Error(`Workspace ${workspaceId} not found`);
    const idx = ws.providers.findIndex((p) => p.provider === provider);
    if (idx < 0) throw new Error(`Provider ${provider} not found`);
    ws.providers[idx] = { ...ws.providers[idx], ...updates };
    return ws.providers[idx];
  }

  removeProvider(workspaceId: string, provider: AiProvider): void {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) throw new Error(`Workspace ${workspaceId} not found`);
    ws.providers = ws.providers.filter((p) => p.provider !== provider);
    if (ws.defaultProviderId === provider && ws.providers.length > 0) {
      ws.defaultProviderId = ws.providers[0].provider;
    }
  }

  updateMember(memberId: string, updates: Partial<Member>): Member {
    const member = this.members.get(memberId);
    if (!member) throw new Error(`Member ${memberId} not found`);
    Object.assign(member, updates);
    return member;
  }

  updateMessageReaction(messageId: string, emoji: string, reacted: boolean): MessageReaction[] {
    const message = this.messages.get(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    const reactions = message.reactions ?? [];
    const idx = reactions.findIndex((r) => r.emoji === emoji);

    if (idx >= 0) {
      const existing = reactions[idx];
      if (reacted) {
        // User is reacting - increment count
        reactions[idx] = { ...existing, count: existing.count + 1, reacted: true };
      } else {
        // User is unreacting - decrement count
        if (existing.count <= 1) {
          reactions.splice(idx, 1);
        } else {
          reactions[idx] = { ...existing, count: existing.count - 1, reacted: false };
        }
      }
    } else if (reacted) {
      // New reaction
      reactions.push({ emoji, count: 1, reacted: true });
    }

    message.reactions = reactions;
    return reactions;
  }
}
