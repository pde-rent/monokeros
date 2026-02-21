import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { ServerWebSocket } from 'bun';
import { ChatMessage, WS_EVENTS } from '@monokeros/types';
import { WS_OPEN } from '@monokeros/constants';
import { BaseGateway } from '../common/base.gateway';

@WebSocketGateway()
export class ChatGateway extends BaseGateway implements OnGatewayDisconnect {
  private rooms = new Map<string, Set<ServerWebSocket<any>>>();

  handleDisconnect(client: ServerWebSocket<any>) {
    const rooms: Set<string> | undefined = client.data?.rooms;
    if (!rooms) return;
    for (const room of rooms) {
      const clients = this.rooms.get(room);
      if (!clients) continue;
      clients.delete(client);
      if (clients.size === 0) this.rooms.delete(room);
    }
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: ServerWebSocket<any>, @MessageBody() conversationId: string) {
    const room = `conversation:${conversationId}`;
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    const clients = this.rooms.get(room)!;
    if (clients.has(client)) return;
    clients.add(client);
    // Track rooms on client data for cleanup on disconnect
    client.data ??= {};
    (client.data.rooms ??= new Set<string>()).add(room);
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: ServerWebSocket<any>, @MessageBody() conversationId: string) {
    const room = `conversation:${conversationId}`;
    const clients = this.rooms.get(room);
    if (!clients) return;
    clients.delete(client);
    if (clients.size === 0) this.rooms.delete(room);
  }

  protected override emitTo(room: string, event: string, data: Record<string, any>) {
    const clients = this.rooms.get(room);
    if (!clients) return;
    const payload = JSON.stringify({ event, data });
    for (const client of clients) {
      if (client.readyState === WS_OPEN) {
        client.send(payload);
      }
    }
  }

  emitMessage(conversationId: string, message: ChatMessage) {
    this.emitTo(`conversation:${conversationId}`, WS_EVENTS.chat.message, {
      conversationId,
      message,
    });
  }

  emitStreamStart(conversationId: string, agentId: string) {
    this.emitTo(`conversation:${conversationId}`, WS_EVENTS.chat.streamStart, {
      conversationId,
      agentId,
    });
  }

  emitStreamChunk(conversationId: string, chunk: string) {
    this.emitTo(`conversation:${conversationId}`, WS_EVENTS.chat.streamChunk, {
      conversationId,
      chunk,
    });
  }

  emitStreamEnd(conversationId: string, messageId: string, renderedHtml?: string) {
    this.emitTo(`conversation:${conversationId}`, WS_EVENTS.chat.streamEnd, {
      conversationId,
      messageId,
      renderedHtml,
    });
  }

  emitTyping(conversationId: string, agentId: string) {
    this.emitTo(`conversation:${conversationId}`, WS_EVENTS.chat.typing, {
      conversationId,
      agentId,
    });
  }

  emitThinkingStatus(conversationId: string, phase: string) {
    this.emitTo(`conversation:${conversationId}`, WS_EVENTS.chat.thinkingStatus, {
      conversationId,
      phase,
    });
  }

  emitToolStart(conversationId: string, data: { id: string; name: string; args?: Record<string, string> }) {
    this.emitTo(`conversation:${conversationId}`, WS_EVENTS.chat.toolStart, {
      conversationId,
      ...data,
    });
  }

  emitToolEnd(conversationId: string, data: { id: string; name: string; durationMs: number }) {
    this.emitTo(`conversation:${conversationId}`, WS_EVENTS.chat.toolEnd, {
      conversationId,
      ...data,
    });
  }
}
