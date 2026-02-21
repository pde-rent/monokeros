import React from 'react';

interface ListRowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  children: React.ReactNode;
}

/**
 * A reusable clickable list row with active state.
 * Pattern: flex w-full items-start gap-2 px-3 py-1.5 text-left transition-all
 */
export function ListRowButton({
  isActive = false,
  children,
  className = '',
  ...props
}: ListRowButtonProps) {
  return (
    <button
      className={`flex w-full items-start gap-2 px-3 py-1.5 text-left transition-all ${
        isActive
          ? 'bg-blue-light text-fg'
          : 'text-fg-2 hover:bg-surface-3 hover:text-fg'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
