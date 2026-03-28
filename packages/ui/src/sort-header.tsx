import React from "react";

interface SortHeaderProps<K extends string> {
  label: string;
  column: K;
  sortKey: K;
  sortDir: "asc" | "desc";
  onSort: (column: K) => void;
}

export function SortHeader<K extends string>({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: SortHeaderProps<K>) {
  return (
    <th
      className="cursor-pointer px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-fg-3 hover:text-fg-2"
      onClick={() => onSort(column)}
    >
      {label}
      {sortKey === column && (
        <span className="ml-1">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
      )}
    </th>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-fg-3">
      {children}
    </th>
  );
}
