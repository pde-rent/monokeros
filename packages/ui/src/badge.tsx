import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'subtle';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variants = {
    neutral: 'bg-surface-3 text-fg-2',
    subtle: 'bg-surface-2 text-fg-2',
  };

  return (
    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
