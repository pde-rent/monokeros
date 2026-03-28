import React from "react";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A reusable small uppercase label for sections.
 * Pattern: text-[10px] font-semibold uppercase tracking-wider text-fg-3
 */
export function SectionLabel({ children, className = "" }: SectionLabelProps) {
  return (
    <div
      className={`mb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-3 ${className}`}
    >
      {children}
    </div>
  );
}
