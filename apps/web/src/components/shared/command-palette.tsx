"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { createTextFilter } from "@monokeros/utils";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Kbd, ListRowButton, Input } from "@monokeros/ui";

interface Command {
  id: string;
  label: string;
  shortcut: string;
  href: string;
}

const filterCommands = createTextFilter<Command>("label");

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { workspace: slug } = useParams<{ workspace: string }>();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const commands = useMemo((): Command[] => {
    const base = slug ? `/${slug}` : "";
    return [
      { id: "org", label: "Go to Org", shortcut: "G O", href: `${base}/org` },
      { id: "projects", label: "Go to Projects", shortcut: "G P", href: `${base}/projects` },
      { id: "chat", label: "Go to Chat", shortcut: "G C", href: `${base}/chat` },
      { id: "files", label: "Go to Files", shortcut: "G F", href: `${base}/files` },
    ];
  }, [slug]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredCommands = filterCommands(commands, query);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        window.location.href = filteredCommands[selectedIndex].href;
        onClose();
      }
    },
    [open, filteredCommands, selectedIndex, onClose],
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[480px] border border-edge bg-elevated shadow-xl rounded-md">
        <div className="border-b border-edge px-3 py-2.5">
          <div className="flex items-center gap-2">
            <MagnifyingGlassIcon className="h-4 w-4 text-fg-3" />
            <Input
              variant="transparent"
              placeholder="Search commands..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-fg-3">No commands found</div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <ListRowButton
                key={cmd.id}
                isActive={index === selectedIndex}
                onClick={() => {
                  window.location.href = cmd.href;
                  onClose();
                }}
                className="justify-between rounded-sm"
              >
                <span>{cmd.label}</span>
                <span className="text-xs text-fg-3">{cmd.shortcut}</span>
              </ListRowButton>
            ))
          )}
        </div>
        <div className="border-t border-edge px-3 py-2">
          <div className="flex items-center gap-3 text-xs text-fg-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd>
              to close
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
