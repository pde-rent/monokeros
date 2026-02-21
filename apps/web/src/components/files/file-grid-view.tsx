'use client';

import { useState, useMemo, useEffect } from 'react';
import type { FileEntry } from '@monokeros/types';
import { getFileIcon, getFileIconColor } from '@/lib/file-icons';
import { EmptyState } from '@monokeros/ui';
import { PathBar } from './path-bar';

interface Props {
  files: FileEntry[];
  selectedPath: string | null;
  onSelect: (file: FileEntry) => void;
  category: string;
  ownerId: string;
  onContextMenu?: (e: React.MouseEvent, entry: FileEntry | null) => void;
}

/** Walk the file tree following the current path segments */
function getFilesAtPath(files: FileEntry[], pathSegments: string[]): FileEntry[] {
  let current = files;
  for (const seg of pathSegments) {
    const dir = current.find((f) => f.type === 'directory' && f.name === seg);
    if (!dir?.children) return [];
    current = dir.children;
  }
  return current;
}

export function FileGridView({ files, selectedPath, onSelect, category, ownerId, onContextMenu }: Props) {
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  // Reset path when workspace changes
  useEffect(() => {
    setCurrentPath([]);
  }, [category, ownerId]);

  const visibleFiles = useMemo(
    () => getFilesAtPath(files, currentPath),
    [files, currentPath],
  );

  function handleNavigateInto(folder: FileEntry) {
    setCurrentPath([...currentPath, folder.name]);
  }

  function handlePathNavigate(depth: number) {
    setCurrentPath(currentPath.slice(0, depth));
  }

  return (
    <div className="flex h-full flex-col">
      <PathBar segments={currentPath} onNavigate={handlePathNavigate} />

      <div
        className="flex-1 overflow-y-auto p-4"
        onContextMenu={(e) => {
          if (e.target === e.currentTarget && onContextMenu) {
            onContextMenu(e, null);
          }
        }}
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
          {visibleFiles.map((entry) => (
            <FileGridItem
              key={entry.id}
              entry={entry}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onNavigateInto={handleNavigateInto}
              onContextMenu={onContextMenu}
            />
          ))}
          {visibleFiles.length === 0 && (
            <div className="col-span-full">
              <EmptyState>Empty folder</EmptyState>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileGridItem({
  entry,
  selectedPath,
  onSelect,
  onNavigateInto,
  onContextMenu,
}: {
  entry: FileEntry;
  selectedPath: string | null;
  onSelect: (file: FileEntry) => void;
  onNavigateInto: (folder: FileEntry) => void;
  onContextMenu?: (e: React.MouseEvent, entry: FileEntry | null) => void;
}) {
  const isDir = entry.type === 'directory';
  const isSelected = entry.path === selectedPath;

  const Icon = getFileIcon(entry);
  const iconColor = getFileIconColor(entry);

  function handleClick() {
    onSelect(entry);
  }

  function handleDoubleClick() {
    if (isDir) {
      onNavigateInto(entry);
    }
  }

  return (
    <button
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e, entry); }}
      className={`flex h-[88px] w-full flex-col items-center justify-center gap-1.5 rounded-sm p-2 transition-colors ${
        isSelected
          ? 'bg-blue-light outline outline-1 outline-blue'
          : 'hover:bg-surface-3'
      }`}
      title={entry.name}
    >
      <Icon
        size={40}
        weight={isDir ? 'fill' : 'regular'}
        color={iconColor}
        className="shrink-0"
      />
      <span
        className={`w-full truncate text-center text-xs leading-tight ${
          isSelected
            ? 'text-fg'
            : 'text-fg-2'
        }`}
      >
        {entry.name}
      </span>
    </button>
  );
}
