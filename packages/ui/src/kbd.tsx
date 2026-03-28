import React from "react";

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Keyboard shortcut badge component.
 * Pattern: bg-surface-2 px-1.5 py-0.5 font-mono
 */
export function Kbd({ children, className = "" }: KbdProps) {
  return (
    <kbd className={`bg-surface-2 px-1.5 py-0.5 font-mono text-fg-2 rounded-sm ${className}`}>
      {children}
    </kbd>
  );
}
