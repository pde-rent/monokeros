"use client";

import { useEffect, useRef, useMemo } from "react";
import { useConversation } from "@/hooks/use-queries";
import { useChatStore } from "@/stores/chat-store";
import { MessageRole } from "@monokeros/types";
import type { ChatMessage } from "@monokeros/types";

// Human-friendly tool labels
const TOOL_LABELS: Record<string, string> = {
  web_search: "Web search",
  web_read: "Read page",
  file_read: "Read file",
  file_write: "Write file",
  list_drives: "List drives",
  knowledge_search: "Knowledge search",
};

interface Props {
  conversationId: string;
}

/** Read-only thinking thread for task detail — shows THINKING messages and tool events */
export function ThinkingThread({ conversationId }: Props) {
  const { data: conversation } = useConversation(conversationId);
  const { thinkingPhase, activeToolCalls } = useChatStore();
  const endRef = useRef<HTMLDivElement>(null);

  // Convex reactivity provides real-time updates — no manual socket needed

  const messages = conversation?.messages ?? [];
  const thinkingMessages = useMemo(
    () => messages.filter((m) => m.role === MessageRole.THINKING),
    [messages],
  );

  // Auto-scroll as new thinking arrives
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thinkingMessages.length, thinkingPhase]);

  if (thinkingMessages.length === 0 && !thinkingPhase) {
    return (
      <div className="px-3 py-4 text-center text-[9px] text-fg-3">
        No thinking events recorded yet.
      </div>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto">
      <div className="space-y-0.5 p-2">
        {thinkingMessages.map((msg) => (
          <ThinkingEntry key={msg.id} message={msg} />
        ))}

        {/* Live indicator for active thinking */}
        {thinkingPhase && (
          <div className="flex items-center gap-1.5 px-2 py-1">
            <div className="h-2 w-2 animate-spin rounded-full border border-fg-3 border-t-transparent" />
            <span className="text-[9px] text-fg-2">
              {activeToolCalls.length > 0
                ? (TOOL_LABELS[activeToolCalls[activeToolCalls.length - 1].name] ??
                  activeToolCalls[activeToolCalls.length - 1].name)
                : thinkingPhase}
              ...
            </span>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

function ThinkingEntry({ message }: { message: ChatMessage }) {
  const content = message.content;

  // Parse special thinking message formats
  const isPhase = content.startsWith("[") && content.endsWith("]") && !content.includes("tool:");
  const isToolStart = content.startsWith("[tool:") && !content.includes("completed");
  const isToolEnd = content.startsWith("[tool:") && content.includes("completed");

  if (isPhase) {
    const phase = content.slice(1, -1);
    return <div className="px-2 py-0.5 text-[8px] text-fg-3 uppercase tracking-wider">{phase}</div>;
  }

  if (isToolStart || isToolEnd) {
    // Extract tool name
    const match = content.match(/\[tool:(\w+)/);
    const toolName = match?.[1] ?? "unknown";
    const label = TOOL_LABELS[toolName] ?? toolName;

    if (isToolEnd) {
      const durationMatch = content.match(/(\d+)ms/);
      const durationMs = durationMatch ? parseInt(durationMatch[1]) : null;
      return (
        <div className="flex items-center gap-1 px-2 py-0.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green" />
          <span className="text-[9px] text-fg-2">{label}</span>
          {durationMs !== null && durationMs !== undefined && (
            <span className="text-[8px] text-fg-3">{(durationMs / 1000).toFixed(1)}s</span>
          )}
        </div>
      );
    }

    // Tool start — extract args if present
    const argsStart = content.indexOf("]");
    const argsStr = argsStart > 0 ? content.slice(argsStart + 1).trim() : "";

    return (
      <div className="flex items-center gap-1 px-2 py-0.5">
        <div className="h-1.5 w-1.5 animate-spin rounded-full border border-blue border-t-transparent" />
        <span className="text-[9px] text-fg-2">{label}</span>
        {argsStr && <span className="truncate text-[8px] text-fg-3 max-w-[200px]">{argsStr}</span>}
      </div>
    );
  }

  // Generic thinking message
  return <div className="px-2 py-0.5 text-[9px] text-fg-2">{content}</div>;
}
