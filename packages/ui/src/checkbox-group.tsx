"use client";

import React from "react";

interface CheckboxGroupProps<T> {
  items: T[];
  selected: string[];
  onChange: (selected: string[]) => void;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  className?: string;
}

export function CheckboxGroup<T>({
  items,
  selected,
  onChange,
  getId,
  getLabel,
  className = "",
}: CheckboxGroupProps<T>) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className={`space-y-0.5 ${className}`}>
      {items.map((item) => {
        const id = getId(item);
        return (
          <label key={id} className="flex items-center gap-1.5 text-xs text-fg cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={() => toggle(id)}
              className="accent-blue"
            />
            {getLabel(item)}
          </label>
        );
      })}
    </div>
  );
}
