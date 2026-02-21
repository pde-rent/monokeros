import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Bot } from 'grammy';
import { MockStore } from '../store/mock-store';
import { OpenClawService } from '../openclaw/openclaw.service';
import { ChatGateway } from '../chat/chat.gateway';
import { RenderService } from '../render/render.service';
import type { Workspace, Conversation, ChatMessage } from '@monokeros/types';
import { MessageRole, ConversationType } from '@monokeros/types';
import { SYSTEM_AGENT_MONO } from '@monokeros/constants';
import { generateId, now } from '@monokeros/utils';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(TelegramService.name);
  private readonly bots = new Map<string, Bot>();

  constructor(
    private store: MockStore,
    private openclaw: OpenClawService,
    private chatGateway: ChatGateway,
    private renderService: RenderService,
  ) {}

  async onModuleInit() {
    for (const ws of this.store.workspaces.values()) {
      if (ws.telegramBotToken) {
        await this.startBot(ws);
      }
    }
  }

  async onModuleDestroy() {
    await this.stopAll();
  }

  /** Start a grammY bot for a workspace */
  async startBot(workspace: Workspace): Promise<void> {
    if (!workspace.telegramBotToken) return;

    // Stop existing bot for this workspace if any
    await this.stopBot(workspace.id);

    const bot = new Bot(workspace.telegramBotToken);

    bot.on('message:text', async (ctx) => {
      const chatId = ctx.chat.id;
      const text = ctx.message.text;
      const firstName = ctx.from?.first_name ?? '';
      const lastName = ctx.from?.last_name ?? '';

      try {
        // Find or create conversation for this Telegram chat
        const conversation = this.findOrCreateConversation(
          workspace,
          chatId,
          firstName,
          lastName,
        );

        // Resolve the Mono agent ID for this workspace
        const monoId = this.resolveMonoId(workspace.id);
        if (!monoId) {
          await ctx.reply('No dispatcher agent is available for this workspace.');
          return;
        }

        // Store the user message
        const userMessage: ChatMessage = {
          id: generateId('msg'),
          conversationId: conversation.id,
          role: MessageRole.USER,
          content: text,
          memberId: null,
          timestamp: now(),
          references: [],
          attachments: [],
        };
        this.store.messages.set(userMessage.id, userMessage);
        conversation.messageCount++;
        conversation.lastMessageAt = userMessage.timestamp;

        // Emit to web UI
        this.chatGateway.emitMessage(conversation.id, userMessage);

        // Send "Thinking..." placeholder
        const placeholder = await ctx.reply('Thinking...');

        // Stream response from OpenClaw
        this.chatGateway.emitStreamStart(conversation.id, monoId);

        let finalResponse = '';

        for await (const event of this.openclaw.streamMessage(monoId, text, conversation.id)) {
          switch (event.type) {
            case 'status':
              this.chatGateway.emitThinkingStatus(conversation.id, event.data.phase);
              break;
            case 'tool_start':
              this.chatGateway.emitToolStart(conversation.id, event.data);
              break;
            case 'tool_end':
              this.chatGateway.emitToolEnd(conversation.id, event.data);
              break;
            case 'content':
              this.chatGateway.emitStreamChunk(conversation.id, event.data.text);
              break;
            case 'done':
              finalResponse = event.data.response;
              break;
            case 'error':
              this.chatGateway.emitStreamEnd(conversation.id, '');
              await ctx.api.editMessageText(
                chatId,
                placeholder.message_id,
                `Error: ${event.data.message}`,
              );
              return;
          }
        }

        // Render and store the agent response
        const rendered = await this.renderService.renderMarkdown(finalResponse);

        const agentMessage: ChatMessage = {
          id: generateId('msg'),
          conversationId: conversation.id,
          role: MessageRole.AGENT,
          content: finalResponse,
          renderedHtml: rendered.html,
          memberId: monoId,
          timestamp: now(),
          references: [],
          attachments: [],
        };
        this.store.messages.set(agentMessage.id, agentMessage);
        conversation.messageCount++;
        conversation.lastMessageAt = agentMessage.timestamp;

        this.chatGateway.emitStreamEnd(conversation.id, agentMessage.id, rendered.html);

        // Edit the placeholder with the final response
        // Telegram has a 4096 char limit — truncate if needed
        const replyText = finalResponse.length > 4000
          ? finalResponse.slice(0, 4000) + '...'
          : finalResponse;

        await ctx.api.editMessageText(
          chatId,
          placeholder.message_id,
          replyText || '(empty response)',
        );
      } catch (err) {
        this.log.error(`Error handling Telegram message in workspace ${workspace.id}: ${err}`);
        try {
          await ctx.reply('Sorry, something went wrong processing your message.');
        } catch {
          // Can't reply — ignore
        }
      }
    });

    // Handle errors at the bot level
    bot.catch((err) => {
      this.log.error(`Bot error for workspace ${workspace.id}: ${err.message}`);
    });

    try {
      // Start long polling (non-blocking)
      bot.start({
        onStart: () => this.log.log(`Telegram bot started for workspace ${workspace.id}`),
      });
      this.bots.set(workspace.id, bot);
    } catch (err) {
      this.log.error(`Failed to start Telegram bot for workspace ${workspace.id}: ${err}`);
    }
  }

  /** Stop a bot for a workspace */
  async stopBot(workspaceId: string): Promise<void> {
    const bot = this.bots.get(workspaceId);
    if (bot) {
      await bot.stop();
      this.bots.delete(workspaceId);
      this.log.log(`Telegram bot stopped for workspace ${workspaceId}`);
    }
  }

  /** Refresh a bot when token changes */
  async refreshBot(workspace: Workspace): Promise<void> {
    await this.stopBot(workspace.id);
    if (workspace.telegramBotToken) {
      await this.startBot(workspace);
    }
  }

  /** Stop all bots */
  async stopAll(): Promise<void> {
    await Promise.all(
      [...this.bots.keys()].map((id) => this.stopBot(id)),
    );
  }

  /** Get bot info (username) if running */
  async getBotInfo(workspaceId: string): Promise<{ enabled: boolean; username: string | null }> {
    const bot = this.bots.get(workspaceId);
    if (!bot) return { enabled: false, username: null };
    try {
      const me = await bot.api.getMe();
      return { enabled: true, username: me.username };
    } catch {
      return { enabled: true, username: null };
    }
  }

  /** Find the Mono system agent for a workspace */
  private resolveMonoId(workspaceId: string): string | null {
    // Convention: Mono's ID is either `system_mono` (seed data) or `system_mono_{wsId}`
    const candidates = [
      SYSTEM_AGENT_MONO,
      `${SYSTEM_AGENT_MONO}_${workspaceId}`,
    ];
    for (const id of candidates) {
      const member = this.store.members.get(id);
      if (member && member.workspaceId === workspaceId && member.system) {
        return id;
      }
    }
    // Fallback: find any system agent in the workspace
    for (const member of this.store.members.values()) {
      if (member.workspaceId === workspaceId && member.system && member.type === 'agent') {
        return member.id;
      }
    }
    return null;
  }

  /** Find or create a conversation for a Telegram chat */
  private findOrCreateConversation(
    workspace: Workspace,
    chatId: number,
    firstName: string,
    lastName: string,
  ): Conversation {
    const titlePrefix = `Telegram: ${chatId}`;

    // Look for existing conversation
    for (const conv of this.store.conversations.values()) {
      if (
        conv.workspaceId === workspace.id &&
        conv.type === ConversationType.AGENT_DM &&
        conv.title.startsWith(titlePrefix)
      ) {
        return conv;
      }
    }

    // Resolve Mono for participant list
    const monoId = this.resolveMonoId(workspace.id);
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || String(chatId);
    const title = `${titlePrefix} (${displayName})`;

    const conversation: Conversation = {
      id: generateId('conv'),
      workspaceId: workspace.id,
      createdBy: monoId,
      title,
      type: ConversationType.AGENT_DM,
      projectId: null,
      participantIds: monoId ? [monoId] : [],
      lastMessageAt: now(),
      messageCount: 0,
    };
    this.store.conversations.set(conversation.id, conversation);
    return conversation;
  }
}
