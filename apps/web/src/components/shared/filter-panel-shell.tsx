"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { SectionLabel } from "@monokeros/ui";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
}

export function FilterPanelShell({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  children,
}: Props) {
  return (
    <div className="w-full h-full overflow-y-auto bg-surface">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <MagnifyingGlassIcon size={14} className="shrink-0 text-fg-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-xs text-fg outline-none placeholder:text-fg-3"
        />
      </div>
      {children}
    </div>
  );
}

export function FilterSection({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-edge py-2">
      {label && <SectionLabel className="px-3">{label}</SectionLabel>}
      {children}
    </div>
  );
}
