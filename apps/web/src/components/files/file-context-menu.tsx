'use client';

import { useMemo } from 'react';
import { ContextMenu } from '@monokeros/ui';
import type { ContextMenuItem } from '@monokeros/ui';
import { SYSTEM_FILES } from '@monokeros/constants';
import { FilePlusIcon, FolderPlusIcon, CopyIcon, ClipboardTextIcon, PencilSimpleIcon, TrashIcon, ChatCircleIcon } from '@phosphor-icons/react';
import type { FileEntry } from '@monokeros/types';

interface Props {
  position: { x: number; y: number };
  entry: FileEntry | null;
  clipboard: FileEntry | null;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onCopy: (entry: FileEntry) => void;
  onPaste: () => void;
  onDelete: (entry: FileEntry) => void;
  onAskAbout: (entry: FileEntry) => void;
}

export function FileContextMenu({
  position,
  entry,
  clipboard,
  onClose,
  onNewFile,
  onNewFolder,
  onCopy,
  onPaste,
  onDelete,
  onAskAbout,
}: Props) {
  const isProtected = entry ? SYSTEM_FILES.has(entry.name) : false;
  const isRootDir = entry?.type === 'directory' && entry.path.split('/').filter(Boolean).length === 1;

  const items = useMemo<ContextMenuItem[]>(() => {
    const list: ContextMenuItem[] = [
      { id: 'new-file', label: 'New File', icon: FilePlusIcon },
      { id: 'new-folder', label: 'New Folder', icon: FolderPlusIcon },
      { id: 'sep-1', label: '', separator: true },
      { id: 'copy', label: 'Copy', icon: CopyIcon, disabled: !entry || entry.type === 'directory' },
      { id: 'paste', label: 'Paste', icon: ClipboardTextIcon, disabled: !clipboard },
      { id: 'sep-2', label: '', separator: true },
      { id: 'delete', label: 'Delete', icon: TrashIcon, danger: true, disabled: !entry || isProtected || isRootDir },
    ];

    // Add "Ask about..." for files
    if (entry?.type === 'file') {
      list.push(
        { id: 'sep-3', label: '', separator: true },
        { id: 'ask-about', label: 'Ask about...', icon: ChatCircleIcon },
      );
    }

    return list;
  }, [entry, clipboard, isProtected, isRootDir]);

  function handleSelect(id: string) {
    switch (id) {
      case 'new-file': onNewFile(); break;
      case 'new-folder': onNewFolder(); break;
      case 'copy': if (entry) onCopy(entry); break;
      case 'paste': onPaste(); break;
      case 'delete': if (entry) onDelete(entry); break;
      case 'ask-about': if (entry) onAskAbout(entry); break;
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
