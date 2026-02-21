import React from 'react';

interface EmptyStateProps {
  children: React.ReactNode;
  className?: string;
}

export function EmptyState({ children, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex h-full items-center justify-center text-sm text-fg-2 ${className}`}>
      {children}
    </div>
  );
}
