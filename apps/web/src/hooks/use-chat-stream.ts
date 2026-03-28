"use client";

import { useCallback, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";

/**
 * NDJSON fetch-based streaming hook that replaces the WebSocket-based chat socket.
 *
 * Uses `fetch()` with ReadableStream to receive NDJSON events from the
 * Next.js API route → Bun container service → OpenClaw container pipeline.
 */
export function useChatStream() {
  const {
    setStreaming,
    appendStreamChunk,
    setThinkingPhase,
    addToolStart,
    completeToolCall,
    clearStreamingState,
  } = useChatStore();

  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (opts: {
      conversationId: string;
      agentId: string;
      message: string;
    }) => {
      // Cancel any in-flight stream
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      const { conversationId, ...rest } = opts;

      // Set streaming state
      setStreaming(conversationId);

      try {
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, ...rest }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Stream failed" }));
          clearStreamingState();
          throw new Error(err.error || `Stream failed: ${res.status}`);
        }

        if (!res.body) {
          clearStreamingState();
          throw new Error("No response body");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event = JSON.parse(line) as {
                type: string;
                data: Record<string, unknown>;
              };

              switch (event.type) {
                case "status":
                  if (typeof event.data.phase === "string") {
                    setThinkingPhase(event.data.phase);
                  }
                  break;

                case "content":
                  // Delta-based — append chunk
                  if (typeof event.data.delta === "string") {
                    appendStreamChunk(event.data.delta);
                  }
                  break;

                case "tool_start":
                  addToolStart({
                    id: event.data.id as string,
                    name: event.data.name as string,
                    args: event.data.args as Record<string, string> | undefined,
                  });
                  break;

                case "tool_end":
                  completeToolCall(
                    event.data.id as string,
                    event.data.name as string,
                    event.data.durationMs as number,
                  );
                  break;

                case "usage":
                  // Token usage is persisted server-side; log for debugging
                  // eslint-disable-next-line no-console
                  console.debug(
                    "[chat-stream] usage:",
                    event.data.promptTokens,
                    "in /",
                    event.data.completionTokens,
                    "out",
                  );
                  break;

                case "error":
                  // eslint-disable-next-line no-console
                  console.error("[chat-stream]", event.data.message);
                  break;

                case "done":
                  // Stream complete — Convex reactivity will automatically
                  // pick up the stored message, no manual invalidation needed
                  break;
              }
            } catch {
              // Skip malformed NDJSON lines
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled
          return;
        }
        throw err;
      } finally {
        clearStreamingState();
        abortRef.current = null;
      }
    },
    [
      setStreaming,
      appendStreamChunk,
      setThinkingPhase,
      addToolStart,
      completeToolCall,
      clearStreamingState,
    ],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    clearStreamingState();
  }, [clearStreamingState]);

  return { sendMessage, cancel };
}
