import React from 'react';
import { Avatar, getInitials } from './avatar';

export type EntityLinkVariant = 'default' | 'accent-green' | 'accent-blue' | 'accent-orange' | 'accent-purple';

interface EntityLinkProps {
  /** Display name/label */
  label: string;
  /** Click handler */
  onClick: (e: React.MouseEvent) => void;
  /** Optional secondary info shown in tooltip */
  secondaryInfo?: string;
  /** Entity color (for name/avatar) */
  color?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether to show avatar */
  showAvatar?: boolean;
  /** Avatar image URL */
  avatarUrl?: string;
  /** Optional prefix (e.g., "#" for issues, "@" for mentions) */
  prefix?: string;
  /** Visual variant */
  variant?: EntityLinkVariant;
  /** Optional leading icon/badge */
  leading?: React.ReactNode;
  /** Tooltip title override */
  title?: string;
  /** Additional className */
  className?: string;
}

const textSizes = { sm: 'text-xs', md: 'text-sm' } as const;
const avatarSizes = { sm: 'xs', md: 'sm' } as const;

const variantStyles: Record<EntityLinkVariant, string> = {
  default: 'hover:bg-surface-3',
  'accent-green': 'text-green hover:bg-green-light hover:underline',
  'accent-blue': 'text-blue hover:bg-blue-light hover:underline',
  'accent-orange': 'text-orange hover:bg-orange-light hover:underline',
  'accent-purple': 'text-purple hover:bg-purple-light hover:underline',
};

/**
 * A reusable clickable entity link with optional avatar and color.
 * Consolidates patterns from member-link, agent-link, issue-ref.
 */
export function EntityLink({
  label,
  onClick,
  secondaryInfo,
  color,
  size = 'sm',
  showAvatar = true,
  avatarUrl,
  prefix,
  variant = 'default',
  leading,
  title,
  className = '',
}: EntityLinkProps) {
  const displayLabel = prefix ? `${prefix}${label}` : label;
  const tooltip = title ?? (secondaryInfo ? `${label} - ${secondaryInfo}` : label);

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors ${variantStyles[variant]} ${textSizes[size]} ${className}`}
      title={tooltip}
    >
      {leading}
      {showAvatar && (
        <Avatar
          name={label}
          src={avatarUrl}
          color={color}
          size={avatarSizes[size]}
        />
      )}
      <span style={color && variant === 'default' ? { color } : undefined} className="font-medium">
        {displayLabel}
      </span>
    </button>
  );
}
