import { useState, useEffect, useMemo } from "react";
import { renderMarkdown } from "@monokeros/renderer";
import type { ToolCallStatus } from "@/stores/chat-store";
import { TOOL_LABELS } from "./chat-constants";

/** Inline chips showing completed tool calls */
export function CompletedToolChips({ tools }: { tools: ToolCallStatus[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {tools.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-sm bg-surface-3 px-1.5 py-0.5 text-[9px] text-fg-3 font-mono"
        >
          {TOOL_LABELS[t.name] ?? t.name}
          {t.durationMs !== null && t.durationMs !== undefined && (
            <span className="text-fg-3/60">{(t.durationMs / 1000).toFixed(1)}s</span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Thinking indicator with daemon-reported status text */
export function ThinkingIndicator({
  status,
  layout,
  completedTools,
}: {
  status: string;
  layout: "bubbles" | "list";
  completedTools: ToolCallStatus[];
}) {
  const [visible, setVisible] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(status);

  // Animate status text fade in/out
  useEffect(() => {
    setVisible(false);
    const fadeOutTimer = setTimeout(() => {
      setCurrentStatus(status);
      setVisible(true);
    }, 200);
    return () => clearTimeout(fadeOutTimer);
  }, [status]);

  const indicator = (
    <>
      <div className="flex items-center gap-2 px-1 py-0.5">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-fg-3 border-t-transparent" />
        <span
          className={`text-xs text-fg-2 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        >
          {currentStatus}...
        </span>
      </div>
      <CompletedToolChips tools={completedTools} />
    </>
  );

  if (layout === "bubbles") {
    return <div className="max-w-[80%]">{indicator}</div>;
  }

  return (
    <div className="flex items-start gap-3 section-border px-4 py-2 bg-surface">
      <span className="shrink-0 text-xs font-medium text-fg-3 w-16">Agent</span>
      <div>{indicator}</div>
    </div>
  );
}

/** Streaming message — renders markdown from accumulated delta content.
 *  No HTML slicing; delta streaming already provides a natural typing effect. */
export function SmoothStreamingMessage({
  content,
  layout,
  completedTools,
}: {
  content: string;
  layout: "bubbles" | "list";
  completedTools: ToolCallStatus[];
}) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);

  const inner = (
    <>
      <CompletedToolChips tools={completedTools} />
      <div className="rendered-markdown" dangerouslySetInnerHTML={{ __html: rendered.html }} />
      <span className="inline-block animate-pulse">&#x2588;</span>
    </>
  );

  if (layout === "bubbles") {
    return <div className="max-w-[80%]">{inner}</div>;
  }

  return (
    <div className="flex items-start gap-3 section-border px-4 py-2 bg-surface">
      <span className="shrink-0 text-xs font-medium text-fg-3 w-16">Agent</span>
      <div className="min-w-0 flex-1 text-xs text-fg">{inner}</div>
    </div>
  );
}
