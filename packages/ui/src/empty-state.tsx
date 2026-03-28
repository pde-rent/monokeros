import React from "react";

interface EmptyStateProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A consistent empty state component used across the app.
 * Displays centered text with muted styling.
 */
export function EmptyState({ children, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center text-xs text-fg-3 ${className}`}
    >
      {children}
    </div>
  );
}
