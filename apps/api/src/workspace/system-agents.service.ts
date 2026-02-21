import { Injectable, Logger } from '@nestjs/common';
import type { Member, Conversation, ChatMessage } from '@monokeros/types';
import { MemberStatus, MessageRole, MemberType, ConversationType } from '@monokeros/types';
import { generateId, now } from '@monokeros/utils';
import { SYSTEM_AGENT_MONO, SYSTEM_AGENT_KEROS } from '@monokeros/constants';
import { generateAvatar } from '@monokeros/avatar';
import { MockStore } from '../store/mock-store';
import { FilesService } from '../files/files.service';
import { ApiKeyService } from '../auth/api-key.service';
import { OpenClawService } from '../openclaw/openclaw.service';

@Injectable()
export class SystemAgentsService {
  private readonly log = new Logger(SystemAgentsService.name);

  constructor(
    private store: MockStore,
    private filesService: FilesService,
    private apiKeyService: ApiKeyService,
    private openclaw: OpenClawService,
  ) {}

  /**
   * Bootstrap Mono + Keros system agents for a workspace.
   * Creates members, drives, avatars, welcome conversations, and API keys.
   */
  async bootstrap(wsId: string, displayName: string, context?: string): Promise<{ monoId: string; kerosId: string }> {
    const timestamp = now();

    // ── Mono (Dispatcher) ──────────────────────────────
    const monoId = `${SYSTEM_AGENT_MONO}_${wsId}`;
    const mono: Member = {
      id: monoId,
      workspaceId: wsId,
      name: 'Mono',
      type: MemberType.AGENT,
      title: 'Dispatcher',
      specialization: 'Workspace Orchestration',
      teamId: null,
      isLead: false,
      system: true,
      status: MemberStatus.IDLE,
      currentTaskId: null,
      currentProjectId: null,
      avatarUrl: generateAvatar({ seed: monoId }),
      gender: 1,
      identity: {
        soul: 'Calm, precise workspace orchestrator who routes conversations to the right teams and helps configure the workspace.',
        skills: ['workspace orchestration', 'team routing', 'org design'],
        memory: context ? [context] : [],
      },
      stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
      email: null,
      passwordHash: null,
      supervisedTeamIds: [],
      modelConfig: null,
    };
    this.store.members.set(monoId, mono);

    // ── Keros (Project Manager) ────────────────────────
    const kerosId = `${SYSTEM_AGENT_KEROS}_${wsId}`;
    const keros: Member = {
      id: kerosId,
      workspaceId: wsId,
      name: 'Keros',
      type: MemberType.AGENT,
      title: 'Project Manager',
      specialization: 'Project Lifecycle Management',
      teamId: null,
      isLead: false,
      system: true,
      status: MemberStatus.IDLE,
      currentTaskId: null,
      currentProjectId: null,
      avatarUrl: generateAvatar({ seed: kerosId }),
      gender: 1,
      identity: {
        soul: 'Strategic project orchestrator who decomposes user intent into actionable projects, tasks, and team assignments. Thinks in terms of work breakdown structures, dependencies, and delivery phases. Never performs domain work — builds the scaffolding so teams can execute.',
        skills: ['project planning', 'WBS decomposition', 'task management', 'team assignment', 'phase management'],
        memory: context ? [context] : [],
      },
      stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
      email: null,
      passwordHash: null,
      supervisedTeamIds: [],
      modelConfig: null,
    };
    this.store.members.set(kerosId, keros);

    // ── Drives & Avatars ───────────────────────────────
    this.filesService.ensureMemberDrive(monoId);
    this.filesService.ensureMemberDrive(kerosId);
    // Save in background — don't block
    Promise.all([
      this.filesService.generateAndSaveAvatar(monoId).then(() => {}),
      this.filesService.generateAndSaveAvatar(kerosId).then(() => {}),
    ]);

    // ── Welcome Conversations ──────────────────────────
    const monoConvId = generateId('conv');
    const monoConv: Conversation = {
      id: monoConvId,
      workspaceId: wsId,
      createdBy: monoId,
      title: 'Mono',
      type: ConversationType.AGENT_DM,
      projectId: null,
      participantIds: [monoId],
      lastMessageAt: timestamp,
      messageCount: 1,
    };
    this.store.conversations.set(monoConvId, monoConv);

    const monoMsgId = generateId('msg');
    const monoMsg: ChatMessage = {
      id: monoMsgId,
      conversationId: monoConvId,
      role: MessageRole.AGENT,
      content: `Welcome to **${displayName}**! I'm Mono, your workspace dispatcher. I route conversations to the right teams and help you configure your workspace. Ask me anything.`,
      memberId: monoId,
      timestamp,
      references: [],
      attachments: [],
    };
    this.store.messages.set(monoMsgId, monoMsg);

    const kerosConvId = generateId('conv');
    const kerosConv: Conversation = {
      id: kerosConvId,
      workspaceId: wsId,
      createdBy: kerosId,
      title: 'Keros',
      type: ConversationType.AGENT_DM,
      projectId: null,
      participantIds: [kerosId],
      lastMessageAt: timestamp,
      messageCount: 1,
    };
    this.store.conversations.set(kerosConvId, kerosConv);

    const kerosMsgId = generateId('msg');
    const kerosMsg: ChatMessage = {
      id: kerosMsgId,
      conversationId: kerosConvId,
      role: MessageRole.AGENT,
      content: `I'm Keros, the project manager for **${displayName}**. I handle project planning, task creation, and team assignments. When you or Mono delegate work to me, I'll break it down into projects, create WBS documents, and assign tasks to the right teams.`,
      memberId: kerosId,
      timestamp,
      references: [],
      attachments: [],
    };
    this.store.messages.set(kerosMsgId, kerosMsg);

    // ── API Keys ───────────────────────────────────────
    await this.apiKeyService.create(
      { memberId: monoId, name: 'Mono daemon key', permissions: ['*'], expiresAt: null },
      wsId,
    );
    await this.apiKeyService.create(
      { memberId: kerosId, name: 'Keros daemon key', permissions: ['*'], expiresAt: null },
      wsId,
    );

    // Start system agent daemons in background (don't block workspace creation)
    Promise.all([
      this.openclaw.start(monoId),
      this.openclaw.start(kerosId),
    ]).then((results) => {
      for (const rt of results) {
        this.log.log(`System agent ${rt.memberId} -> ${rt.status}`);
      }
    }).catch((err) => {
      this.log.error(`Failed to start system agents: ${err}`);
    });

    return { monoId, kerosId };
  }
}
