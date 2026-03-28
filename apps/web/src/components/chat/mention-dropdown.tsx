"use client";

import type { MentionSuggestion } from "@/hooks/use-mentions";
import { AtIcon, HashIcon, TildeIcon, FileTextIcon } from "@phosphor-icons/react";

interface Props {
  suggestions: MentionSuggestion[];
  activeIndex: number;
  triggerMeta: { type: string; label: string; color: string } | null;
  onSelect: (suggestion: MentionSuggestion) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRIGGER_ICONS: Record<string, React.ComponentType<any>> = {
  agent: AtIcon,
  project: HashIcon,
  task: TildeIcon,
  file: FileTextIcon,
};

export function MentionDropdown({ suggestions, activeIndex, triggerMeta, onSelect }: Props) {
  if (!triggerMeta || suggestions.length === 0) return null;

  const TriggerIcon = TRIGGER_ICONS[triggerMeta.type] ?? AtIcon;

  return (
    <div className="absolute bottom-full left-0 z-30 mb-1 w-72 border border-edge bg-elevated shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-edge px-3 py-1.5">
        <TriggerIcon size={12} />
        <span className="text-xs font-medium uppercase tracking-wider text-fg-3">
          {triggerMeta.label}
        </span>
      </div>

      {/* Suggestions */}
      <div className="max-h-[200px] overflow-y-auto py-0.5">
        {suggestions.map((s, i) => (
          <button
            key={s.id}
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent input blur
              onSelect(s);
            }}
            className={`flex w-full items-center gap-2 px-3 py-1 text-left text-sm transition-colors ${
              i === activeIndex
                ? "bg-surface-3 text-fg"
                : "text-fg-2 hover:bg-surface-3 hover:text-fg"
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
            {s.secondary && (
              <span className="shrink-0 truncate text-xs text-fg-3">{s.secondary}</span>
            )}
          </button>
        ))}
      </div>

      {/* Footer hints */}
      <div className="flex items-center gap-3 border-t border-edge px-3 py-1">
        <span className="text-xs text-fg-3">
          <kbd className="font-mono">↑↓</kbd> navigate
        </span>
        <span className="text-xs text-fg-3">
          <kbd className="font-mono">Tab</kbd> accept
        </span>
        <span className="text-xs text-fg-3">
          <kbd className="font-mono">Esc</kbd> dismiss
        </span>
      </div>
    </div>
  );
}
