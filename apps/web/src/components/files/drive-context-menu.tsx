'use client';

import { useMemo } from 'react';
import { ContextMenu } from '@monokeros/ui';
import type { ContextMenuItem } from '@monokeros/ui';
import { ChatCircleIcon, FolderOpenIcon } from '@phosphor-icons/react';
import type { DriveSelection } from './files-page';

interface Props {
  position: { x: number; y: number };
  drive: DriveSelection | null;
  driveName: string;
  onClose: () => void;
  onAskAbout: (drive: DriveSelection) => void;
  onBrowse: (drive: DriveSelection) => void;
}

export function DriveContextMenu({
  position,
  drive,
  driveName,
  onClose,
  onAskAbout,
  onBrowse,
}: Props) {
  const items = useMemo<ContextMenuItem[]>(() => {
    if (!drive) {
      return [
        { id: 'browse', label: 'Browse files', icon: FolderOpenIcon },
      ];
    }

    return [
      { id: 'browse', label: `Open ${driveName}`, icon: FolderOpenIcon },
      { id: 'sep-1', label: '', separator: true },
      { id: 'ask-about', label: 'Ask about...', icon: ChatCircleIcon },
    ];
  }, [drive, driveName]);

  function handleSelect(id: string) {
    if (!drive && id !== 'browse') {
      onClose();
      return;
    }

    switch (id) {
      case 'browse':
        if (drive) onBrowse(drive);
        break;
      case 'ask-about':
        if (drive) onAskAbout(drive);
        break;
    }
    onClose();
  }

  return (
    <ContextMenu
      position={position}
      items={items}
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
}
