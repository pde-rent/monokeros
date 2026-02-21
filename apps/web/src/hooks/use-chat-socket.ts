'use client';

import { useEffect, useRef } from 'react';
import { WS_EVENTS } from '@monokeros/types';
import { API_PORT } from '@monokeros/constants';
import { useChatStore } from '@/stores/chat-store';
import { invalidateQueries } from '@/lib/query';
import { queryKeys } from '@/lib/query-keys';

/**
 * Connects to the API WebSocket for a given conversation,
 * dispatching stream events into the chat store.
 */
export function useChatSocket(conversationId: string | null) {
  const { setStreaming, setThinkingPhase, addToolStart, completeToolCall, clearStreamingState } = useChatStore();
  const wsRef = useRef<WebSocket | null>(null);
  const actionsRef = useRef({ setStreaming, setThinkingPhase, addToolStart, completeToolCall, clearStreamingState });
  actionsRef.current = { setStreaming, setThinkingPhase, addToolStart, completeToolCall, clearStreamingState };

  useEffect(() => {
    if (!conversationId) return;

    const ws = new WebSocket(`ws://localhost:${API_PORT}`);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      // Join the conversation room
      ws.send(JSON.stringify({ event: 'join', data: conversationId }));
    });

    ws.addEventListener('message', (event) => {
      let parsed: { event: string; data: Record<string, unknown> };
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }

      const { event: evt, data } = parsed;
      const actions = actionsRef.current;

      switch (evt) {
        case WS_EVENTS.chat.streamStart:
          actions.setStreaming(conversationId);
          break;

        case WS_EVENTS.chat.thinkingStatus:
          if (typeof data.phase === 'string') {
            actions.setThinkingPhase(data.phase);
          }
          break;

        case WS_EVENTS.chat.toolStart:
          actions.addToolStart({
            id: data.id as string,
            name: data.name as string,
            args: data.args as Record<string, string> | undefined,
          });
          break;

        case WS_EVENTS.chat.toolEnd:
          actions.completeToolCall(
            data.id as string,
            data.name as string,
            data.durationMs as number,
          );
          break;

        case WS_EVENTS.chat.streamChunk:
          // The controller sends the accumulated content so far
          if (typeof data.chunk === 'string') {
            actions.setStreaming(conversationId, data.chunk);
          }
          break;

        case WS_EVENTS.chat.streamEnd:
          actions.clearStreamingState();
          // Refetch conversation to get the final persisted message with rendered HTML
          invalidateQueries(queryKeys.conversations.detail(conversationId));
          break;

        case WS_EVENTS.chat.message:
          // New message (e.g. own user message echoed back)
          invalidateQueries(queryKeys.conversations.detail(conversationId));
          break;
      }
    });

    ws.addEventListener('close', () => {
      wsRef.current = null;
    });

    return () => {
      // Leave room and close
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'leave', data: conversationId }));
        ws.close();
      } else {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [conversationId]);
}
