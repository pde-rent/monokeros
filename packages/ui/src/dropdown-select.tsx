"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useClickOutside } from "./use-click-outside";

export interface DropdownOption {
  value: string;
  label: string;
}

type DropdownSize = "compact" | "default";

interface DropdownSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  /** compact = filter panels / dialogs, default = forms */
  size?: DropdownSize;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const TRIGGER_STYLES: Record<DropdownSize, string> = {
  compact: "px-2 py-0.5 text-sm",
  default: "px-3 py-1.5 text-sm",
};

const LABEL_STYLES: Record<DropdownSize, string> = {
  compact: "mb-1 block text-[10px] font-medium uppercase tracking-wider text-fg-3",
  default: "text-[10px] font-medium uppercase tracking-wider text-fg-3",
};

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
  error,
  size = "default",
  disabled = false,
  className = "",
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(-1);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const close = useCallback(() => {
    setOpen(false);
    setFocusIndex(-1);
  }, []);

  useClickOutside(containerRef, close, open);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setFocusIndex(options.findIndex((o) => o.value === value));
        } else if (focusIndex >= 0) {
          onChange(options[focusIndex].value);
          close();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setFocusIndex(options.findIndex((o) => o.value === value));
        } else {
          setFocusIndex((prev) => Math.min(prev + 1, options.length - 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) {
          setFocusIndex((prev) => Math.max(prev - 1, 0));
        }
        break;
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [focusIndex]);

  return (
    <div className={`w-full ${className}`}>
      {label && <label className={LABEL_STYLES[size]}>{label}</label>}
      <div ref={containerRef} className={`relative ${size === "default" && label ? "mt-1" : ""}`}>
        <button
          type="button"
          onClick={() => {
            if (!disabled) setOpen((o) => !o);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`
            flex w-full items-center justify-between gap-1
            ${size === "compact" ? "rounded-sm" : "rounded-md"}
            border border-edge
            ${size === "compact" ? "bg-surface" : "bg-surface-2"}
            text-left
            outline-none
            transition-colors
            disabled:opacity-50
            ${open ? "border-blue" : ""}
            ${error ? "border-red" : ""}
            ${TRIGGER_STYLES[size]}
          `}
        >
          <span className={selectedLabel ? "text-fg" : "text-fg-3"}>
            {selectedLabel ?? placeholder ?? "Select..."}
          </span>
          <CaretDownIcon
            size={size === "compact" ? 10 : 12}
            className={`shrink-0 text-fg-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div
            ref={listRef}
            className="absolute left-0 top-full z-30 mt-0.5 max-h-48 w-full overflow-y-auto border border-edge bg-elevated py-0.5 shadow-md rounded-md"
          >
            {options.map((option, i) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                onMouseEnter={() => setFocusIndex(i)}
                className={`flex w-full items-center px-2.5 text-left text-sm transition-colors ${
                  size === "compact" ? "py-0.5" : "py-1"
                } ${
                  option.value === value
                    ? "bg-surface-2 text-fg font-medium"
                    : i === focusIndex
                      ? "bg-surface-2 text-fg"
                      : "text-fg-2 hover:bg-surface-2"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red">{error}</p>}
    </div>
  );
}
