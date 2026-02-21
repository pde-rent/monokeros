'use client';

import { FolderIcon } from '@phosphor-icons/react';
import { Avatar } from '@monokeros/ui';

interface DriveAvatarProps {
  name: string;
  avatarUrl?: string | null;
  color?: string;
}

export function DriveAvatar({ name, avatarUrl, color }: DriveAvatarProps) {
  return (
    <div className="relative h-5 w-5 shrink-0">
      <FolderIcon size={20} weight="fill" color={color ?? 'var(--color-fg-3)'} />
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={name}
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-sm border border-surface object-cover"
        />
      )}
      {!avatarUrl && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <Avatar name={name} color={color} size="xs" className="!h-3 !w-3 !text-[6px]" />
        </div>
      )}
    </div>
  );
}
