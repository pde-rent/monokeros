import { Controller, Get, Post, Patch, Param, Query, Body, BadRequestException, Req } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { ChatGateway } from './chat.gateway';
import { AttachmentsService } from './attachments.service';
import { RenderService } from '../render/render.service';
import { MemberStatus, MessageRole, NotificationType, ConversationType, MemberType, createConversationSchema, renameConversationSchema, sendMessageSchema } from '@monokeros/types';
import type { Conversation, CreateConversationResponse, ChatMessage, MessageAttachment, CreateConversationInput, RenameConversationInput, SendMessageInput } from '@monokeros/types';
import { generateId, now } from '@monokeros/utils';
import { OpenClawService } from '../openclaw/openclaw.service';
import { NotificationsService } from '../notifications/notifications.service';

import { findOrThrow } from '../common/find-or-throw';
import { BaseCrudController } from '../common/base-crud.controller';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PERMISSIONS } from '@monokeros/constants';
import { Permissions } from '../auth/permissions.decorator';
import { MembersGateway } from '../members/members.gateway';

@Controller('workspaces/:slug/conversations')
export class ChatController extends BaseCrudController<Conversation> {
  constructor(
    store: MockStore,
    private gateway: ChatGateway,
    private openclaw: OpenClawService,
    private attachments: AttachmentsService,
    private renderService: RenderService,
    private notificationsService: NotificationsService,
    private membersGateway: MembersGateway,
  ) {
    super(store, 'conversations', 'Conversation');
  }

  @Get()
  @Permissions(PERMISSIONS.conversations.read)
  override list(@Req() req: any) {
    return super.list(req);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.conversations.read)
  override detail(
    @Param('id') id: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const conversation = this.find(id);
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const offset = offsetStr ? parseInt(offsetStr, 10) : undefined;
    const messages = this.store.getMessagesByConversation(id, limit, offset);
    const totalMessages = limit !== null && limit !== undefined ? this.store.getMessageCountByConversation(id) : messages.length;
    return { ...conversation, messages, totalMessages };
  }

  @Post()
  @Permissions(PERMISSIONS.conversations.write)
  create(
    @Body(new ZodValidationPipe(createConversationSchema)) body: CreateConversationInput,
    @Req() req: any,
  ): CreateConversationResponse {
    const { participantIds, title } = body;

    if (participantIds.length === 1) {
      // DM mode — deduplicate
      const targetId = participantIds[0];
      const existing = Array.from(this.store.conversations.values()).find(
        (c) => c.type === ConversationType.AGENT_DM && c.createdBy === targetId,
      );
      if (existing) {
        return { conversation: existing, created: false };
      }
      const member = findOrThrow(this.store.members, targetId, 'Member');
      const conversation: Conversation = {
        id: generateId('conv'),
        workspaceId: req.workspace.id,
        createdBy: targetId,
        title: title || `Chat with ${member.name}`,
        type: ConversationType.AGENT_DM,
        projectId: null,
        participantIds,
        lastMessageAt: now(),
        messageCount: 0,
      };
      this.store.conversations.set(conversation.id, conversation);
      return { conversation, created: true };
    }

    // Group mode
    const memberNames: string[] = [];
    let firstAgentId: string | null = null;
    for (const pid of participantIds) {
      const m = findOrThrow(this.store.members, pid, 'Member');
      memberNames.push(m.name);
      if (!firstAgentId && m.type === MemberType.AGENT) firstAgentId = m.id;
    }
    const conversation: Conversation = {
      id: generateId('conv'),
      workspaceId: req.workspace.id,
      createdBy: firstAgentId,
      title: title || memberNames.join(', '),
      type: ConversationType.GROUP_CHAT,
      projectId: null,
      participantIds,
      lastMessageAt: now(),
      messageCount: 0,
    };
    this.store.conversations.set(conversation.id, conversation);
    return { conversation, created: true };
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.conversations.write)
  rename(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(renameConversationSchema)) body: RenameConversationInput,
  ) {
    const conversation = this.find(id);
    if (conversation.type !== ConversationType.GROUP_CHAT) {
      throw new BadRequestException('Only group chats can be renamed');
    }
    conversation.title = body.title;
    return conversation;
  }

  @Post(':id/messages')
  @Permissions(PERMISSIONS.conversations.write)
  sendMessage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
    @Req() req: any,
  ) {
    const conversation = this.find(id);

    const userMessage: ChatMessage = {
      id: generateId('msg'),
      conversationId: id,
      role: MessageRole.USER,
      content: body.content,
      memberId: null,
      timestamp: now(),
      references: body.references ?? [],
      attachments: [],
    };
    this.store.messages.set(userMessage.id, userMessage);
    conversation.messageCount++;
    conversation.lastMessageAt = userMessage.timestamp;

    this.gateway.emitMessage(id, userMessage);

    // Notify human participants (except the sender)
    const senderId = req.user?.sub ?? req.apiKey?.memberId;
    const humanParticipants = conversation.participantIds.filter((pid) => {
      if (pid === senderId) return false;
      const m = this.store.members.get(pid);
      return m?.type === 'human';
    });
    if (humanParticipants.length > 0) {
      this.notificationsService.createForMany(humanParticipants, {
        workspaceId: conversation.workspaceId,
        type: NotificationType.CHAT_MESSAGE,
        title: 'New message',
        body: `New message in ${conversation.title}.`,
        entityType: 'conversation',
        entityId: conversation.id,
        actorId: senderId ?? null,
      });
    }

    const memberId = conversation.createdBy;
    if (memberId) {
      this.gateway.emitTyping(id, memberId);

      // Detect admin context: system agent + admin caller
      const targetMember = this.store.members.get(memberId);
      const callerRole = req.authMethod === 'jwt' ? req.user?.role : null;
      const isAdminContext = targetMember?.system === true && callerRole === 'admin';

      // Fire-and-forget: agent response is delivered via WebSocket events
      this.processAgentResponse(id, conversation, memberId, body.content, isAdminContext || undefined);
    }

    return userMessage;
  }

  /** Set a member's business status and broadcast the change */
  private setMemberStatus(memberId: string, status: MemberStatus) {
    const member = this.store.members.get(memberId);
    if (member) {
      member.status = status;
      this.membersGateway.emitStatusChanged(memberId, status);
    }
  }

  /** Find or create a task_thread conversation for task-bound thinking */
  private getOrCreateTaskThread(task: { id: string; title: string; workspaceId: string; conversationId: string | null }, memberId: string): Conversation {
    if (task.conversationId) {
      const existing = this.store.conversations.get(task.conversationId);
      if (existing) return existing;
    }

    const conv: Conversation = {
      id: generateId('conv'),
      workspaceId: task.workspaceId,
      createdBy: memberId,
      title: `Thinking: ${task.title}`,
      type: ConversationType.TASK_THREAD,
      projectId: null,
      participantIds: [memberId],
      lastMessageAt: now(),
      messageCount: 0,
    };
    this.store.conversations.set(conv.id, conv);
    task.conversationId = conv.id;
    return conv;
  }

  /** Save a thinking message to a task conversation */
  private saveThinkingMessage(taskConvId: string, memberId: string, content: string) {
    const msg: ChatMessage = {
      id: generateId('msg'),
      conversationId: taskConvId,
      role: MessageRole.THINKING,
      content,
      memberId,
      timestamp: now(),
      references: [],
      attachments: [],
    };
    this.store.messages.set(msg.id, msg);
    const conv = this.store.conversations.get(taskConvId);
    if (conv) {
      conv.messageCount++;
      conv.lastMessageAt = msg.timestamp;
    }
  }

  /** Process agent response in the background, streaming events via WebSocket */
  private async processAgentResponse(
    conversationId: string,
    conversation: Conversation,
    memberId: string,
    content: string,
    adminContext?: boolean,
  ) {
    // Set agent to WORKING while processing
    this.setMemberStatus(memberId, MemberStatus.WORKING);

    // Check if the agent has a current task for thinking routing
    const member = this.store.members.get(memberId);
    const currentTaskId = member?.currentTaskId;
    let taskConvId: string | null = null;

    if (currentTaskId) {
      const task = this.store.tasks.get(currentTaskId);
      if (task) {
        const taskConv = this.getOrCreateTaskThread(task, memberId);
        taskConvId = taskConv.id;
      }
    }

    try {
      this.gateway.emitStreamStart(conversationId, memberId);

      let finalResponse = '';

      for await (const event of this.openclaw.streamMessage(memberId, content, conversationId, adminContext)) {
        switch (event.type) {
          case 'status':
            this.gateway.emitThinkingStatus(conversationId, event.data.phase);
            if (taskConvId) {
              this.saveThinkingMessage(taskConvId, memberId, `[${event.data.phase}]`);
              this.gateway.emitThinkingStatus(taskConvId, event.data.phase);
            }
            break;
          case 'tool_start':
            this.gateway.emitToolStart(conversationId, event.data);
            if (taskConvId) {
              const argsStr = event.data.args ? ` ${JSON.stringify(event.data.args)}` : '';
              this.saveThinkingMessage(taskConvId, memberId, `[tool:${event.data.name}]${argsStr}`);
              this.gateway.emitToolStart(taskConvId, event.data);
            }
            break;
          case 'tool_end':
            this.gateway.emitToolEnd(conversationId, event.data);
            if (taskConvId) {
              this.saveThinkingMessage(taskConvId, memberId, `[tool:${event.data.name} completed in ${event.data.durationMs}ms]`);
              this.gateway.emitToolEnd(taskConvId, event.data);
            }
            break;
          case 'content':
            this.gateway.emitStreamChunk(conversationId, event.data.text);
            break;
          case 'done':
            finalResponse = event.data.response;
            break;
          case 'error':
            this.gateway.emitStreamEnd(conversationId, '');
            this.setMemberStatus(memberId, MemberStatus.IDLE);
            return;
        }
      }

      const rendered = await this.renderService.renderMarkdown(finalResponse);

      const agentMessage: ChatMessage = {
        id: generateId('msg'),
        conversationId,
        role: MessageRole.AGENT,
        content: finalResponse,
        renderedHtml: rendered.html,
        memberId,
        timestamp: now(),
        references: [],
        attachments: [],
      };
      this.store.messages.set(agentMessage.id, agentMessage);
      conversation.messageCount++;
      conversation.lastMessageAt = agentMessage.timestamp;

      this.gateway.emitStreamEnd(conversationId, agentMessage.id, rendered.html);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Chat] processAgentResponse failed for ${memberId}:`, errMsg);
      this.gateway.emitStreamEnd(conversationId, '');
    } finally {
      // Always restore to IDLE when done
      this.setMemberStatus(memberId, MemberStatus.IDLE);
    }
  }

  @Post(':id/attachments')
  @Permissions(PERMISSIONS.conversations.write)
  uploadAttachment(
    @Param('id') id: string,
    @Body() body: { fileName: string; fileSize: number; mimeType?: string },
  ): MessageAttachment {
    const conversation = this.find(id);
    return this.attachments.createAttachment(
      conversation,
      body.fileName,
      body.fileSize,
      body.mimeType,
    );
  }

  @Post(':id/messages/:messageId/reactions')
  @Permissions(PERMISSIONS.conversations.write)
  setReaction(
    @Param('id') _conversationId: string,
    @Param('messageId') messageId: string,
    @Body() body: { emoji: string; reacted: boolean },
  ) {
    const reactions = this.store.updateMessageReaction(messageId, body.emoji, body.reacted);
    return { messageId, reactions };
  }
}
