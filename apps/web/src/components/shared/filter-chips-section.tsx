"use client";

import { FilterSection } from "@/components/shared/filter-panel-shell";
import { FilterChip } from "@/components/shared/filter-chip";

interface FilterChipsSectionProps<T extends string> {
  label: string;
  items: T[];
  labels: Record<T, string>;
  colors: Record<T, string>;
  filter: string[];
  onToggle: (value: T) => void;
}

export function FilterChipsSection<T extends string>({
  label,
  items,
  labels,
  colors,
  filter,
  onToggle,
}: FilterChipsSectionProps<T>) {
  return (
    <FilterSection label={label}>
      <div className="flex flex-wrap gap-1 px-3">
        {items.map((item) => (
          <FilterChip
            key={item}
            label={labels[item]}
            color={colors[item]}
            isActive={filter.length === 0 || filter.includes(item)}
            onClick={() => onToggle(item)}
          />
        ))}
      </div>
    </FilterSection>
  );
}
