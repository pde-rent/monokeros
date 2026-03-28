"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useClickOutside } from "./use-click-outside";

export interface ContextMenuItem {
  id: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: React.ComponentType<any>;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ContextMenu({ position, items, onSelect, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [adjustedPos, setAdjustedPos] = useState(position);

  // Viewport edge detection
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let { x, y } = position;
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
    if (x < 0) x = 4;
    if (y < 0) y = 4;
    setAdjustedPos({ x, y });
  }, [position]);

  useClickOutside(menuRef, onClose);

  // Get selectable item indices
  const selectableIndices = items
    .map((item, i) => (!item.separator && !item.disabled ? i : -1))
    .filter((i) => i >= 0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const curIdx = selectableIndices.indexOf(prev);
          const next = curIdx < selectableIndices.length - 1 ? curIdx + 1 : 0;
          return selectableIndices[next];
        });
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const curIdx = selectableIndices.indexOf(prev);
          const next = curIdx > 0 ? curIdx - 1 : selectableIndices.length - 1;
          return selectableIndices[next];
        });
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && !items[activeIndex].separator && !items[activeIndex].disabled) {
          onSelect(items[activeIndex].id);
        }
      }
    },
    [activeIndex, items, onClose, onSelect, selectableIndices],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-md border border-edge bg-elevated py-0.5 shadow-lg"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={`sep-${i}`} className="my-0.5 border-t border-edge" />
        ) : (
          <button
            key={item.id}
            disabled={item.disabled}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(-1)}
            onClick={() => {
              if (!item.disabled) onSelect(item.id);
            }}
            className={`flex w-full items-center gap-2 px-3 py-1 text-left text-sm transition-colors ${
              item.disabled
                ? "cursor-default text-fg-3"
                : item.danger
                  ? activeIndex === i
                    ? "bg-red/10 text-red"
                    : "text-red hover:bg-red/10"
                  : activeIndex === i
                    ? "bg-surface-3 text-fg"
                    : "text-fg-2 hover:bg-surface-3 hover:text-fg"
            }`}
          >
            {item.icon && <item.icon size={14} />}
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
