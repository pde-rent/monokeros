import React, { useState } from 'react';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  initials?: 'first' | 'full';
  className?: string;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const sizeClasses = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-8 w-8 text-xs',
} as const;

export function Avatar({ name, src, size = 'md', color, initials = 'first', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const label = initials === 'full' ? getInitials(name) : (name[0] ?? '?');
  const roundedClass = 'rounded-sm';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        title={name}
        onError={() => setImgError(true)}
        className={`shrink-0 object-cover ${roundedClass} ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center font-bold text-fg-inverse ${roundedClass} ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color ?? 'var(--color-purple)' }}
      title={name}
    >
      {label}
    </div>
  );
}
