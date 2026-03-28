"use client";

import React from "react";

interface FilterChipGroupProps<T> {
  items: T[];
  selected: string[];
  onChange: (selected: string[]) => void;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getColor: (item: T) => string;
  className?: string;
}

export function FilterChipGroup<T>({
  items,
  selected,
  onChange,
  getId,
  getLabel,
  getColor,
  className = "",
}: FilterChipGroupProps<T>) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {items.map((item) => {
        const id = getId(item);
        const color = getColor(item);
        const isActive = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={`px-1.5 py-0.5 text-[10px] transition-all rounded-sm ${
              isActive ? "font-semibold" : "opacity-40 hover:opacity-60"
            }`}
            style={{
              backgroundColor: isActive
                ? `color-mix(in srgb, ${color} 12%, transparent)`
                : "transparent",
              color: isActive ? color : "var(--color-fg-3)",
            }}
          >
            {getLabel(item)}
          </button>
        );
      })}
    </div>
  );
}
