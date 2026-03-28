"use client";

import { useState, useMemo, useCallback } from "react";
import type { MessageReference } from "@monokeros/types";
import { MessageReferenceType } from "@monokeros/types";

export interface MentionSuggestion {
  id: string;
  label: string;
  secondary?: string;
  type: MessageReference["type"];
  display: string;
  color: string;
}

interface TriggerState {
  trigger: string;
  query: string;
  startIndex: number;
}

const TRIGGER_MAP: Record<string, { type: MessageReferenceType; label: string; color: string }> = {
  "@": { type: MessageReferenceType.AGENT, label: "Agents", color: "var(--color-blue)" },
  "#": { type: MessageReferenceType.PROJECT, label: "Projects", color: "var(--color-green)" },
  "~": { type: MessageReferenceType.TASK, label: "Tasks", color: "var(--color-orange)" },
  ":": { type: MessageReferenceType.FILE, label: "Files", color: "var(--color-purple)" },
};

interface MentionPools {
  agents: MentionSuggestion[];
  projects: MentionSuggestion[];
  tasks: MentionSuggestion[];
  files: MentionSuggestion[];
}

export function useMentions(pools: MentionPools) {
  const [triggerState, setTriggerState] = useState<TriggerState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = useMemo(() => {
    if (!triggerState) return [];
    const meta = TRIGGER_MAP[triggerState.trigger];
    if (!meta) return [];

    let pool: MentionSuggestion[] = [];
    switch (meta.type) {
      case MessageReferenceType.AGENT:
        pool = pools.agents;
        break;
      case MessageReferenceType.PROJECT:
        pool = pools.projects;
        break;
      case MessageReferenceType.TASK:
        pool = pools.tasks;
        break;
      case MessageReferenceType.FILE:
        pool = pools.files;
        break;
    }

    const q = triggerState.query.toLowerCase();
    return pool
      .filter(
        (s) =>
          s.label.toLowerCase().includes(q) || (s.secondary?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 8);
  }, [triggerState, pools]);

  const isActive = triggerState !== null && suggestions.length > 0;

  const triggerMeta = triggerState ? TRIGGER_MAP[triggerState.trigger] : null;

  const detectTrigger = useCallback((text: string, cursorPos: number) => {
    // Walk backward from cursor to find trigger
    let i = cursorPos - 1;
    while (i >= 0 && text[i] !== " " && text[i] !== "\n") {
      const ch = text[i];
      if (ch in TRIGGER_MAP) {
        // Trigger must be at start of input or preceded by space
        if (i === 0 || text[i - 1] === " " || text[i - 1] === "\n") {
          const query = text.slice(i + 1, cursorPos);
          setTriggerState({ trigger: ch, query, startIndex: i });
          setActiveIndex(0);
          return;
        }
      }
      i--;
    }
    setTriggerState(null);
  }, []);

  const acceptSuggestion = useCallback(
    (inputValue: string, suggestion: MentionSuggestion): { text: string; cursorPos: number } => {
      if (!triggerState) return { text: inputValue, cursorPos: inputValue.length };

      const before = inputValue.slice(0, triggerState.startIndex);
      const token = `${triggerState.trigger}${suggestion.display}`;
      const after = inputValue.slice(triggerState.startIndex + 1 + triggerState.query.length);
      const text = `${before}${token} ${after}`;
      const cursorPos = before.length + token.length + 1;

      setTriggerState(null);
      return { text, cursorPos };
    },
    [triggerState],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isActive) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return true;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        return true; // Signal to accept current suggestion
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTriggerState(null);
        return true;
      }
      return false;
    },
    [isActive, suggestions.length],
  );

  const extractReferences = useCallback(
    (content: string): MessageReference[] => {
      const refs: MessageReference[] = [];
      const allPools = [...pools.agents, ...pools.projects, ...pools.tasks, ...pools.files];

      for (const [trigger, meta] of Object.entries(TRIGGER_MAP)) {
        // Match trigger + word chars (including hyphens, dots, underscores)
        const regex = new RegExp(`(?:^|\\s)\\${trigger}([\\w.\\-]+)`, "g");
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
          const display = match[1];
          const suggestion = allPools.find((s) => s.type === meta.type && s.display === display);
          if (suggestion) {
            refs.push({ type: meta.type, id: suggestion.id, display: `${trigger}${display}` });
          }
        }
      }
      return refs;
    },
    [pools],
  );

  return {
    isActive,
    suggestions,
    activeIndex,
    triggerMeta,
    detectTrigger,
    acceptSuggestion,
    handleKeyDown,
    extractReferences,
    currentSuggestion: isActive ? suggestions[activeIndex] : null,
    dismiss: () => setTriggerState(null),
  };
}
