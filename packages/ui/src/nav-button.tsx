import React from 'react';

interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  children: React.ReactNode;
}

/**
 * A reusable navigation button with active state.
 * Pattern: px-3 py-1 text-left text-xs transition-colors
 * Active: bg-blue-light text-fg
 * Inactive: text-fg-2 hover:bg-surface-3 hover:text-fg
 */
export function NavButton({
  isActive = false,
  children,
  className = '',
  ...props
}: NavButtonProps) {
  return (
    <button
      className={`block w-full px-3 py-1 text-left text-xs transition-colors ${
        isActive
          ? 'bg-blue-light font-semibold text-fg'
          : 'text-fg-2 hover:bg-surface-3 hover:text-fg'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
