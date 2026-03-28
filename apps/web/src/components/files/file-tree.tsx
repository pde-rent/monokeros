"use client";

import React, { useState } from "react";
import type { FileEntry } from "@monokeros/types";
import { CaretRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import { getTreeFileIcon, getTreeFileIconColor } from "@/lib/file-icons";
import { formatFileSize } from "@monokeros/utils";

interface Props {
  files: FileEntry[];
  selectedPath: string | null;
  onSelect: (file: FileEntry) => void;
  onContextMenu?: (e: React.MouseEvent, entry: FileEntry | null) => void;
}

export function FileTree({ files, selectedPath, onSelect, onContextMenu }: Props) {
  return (
    <div
      className="min-h-full p-2"
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, null);
      }}
    >
      {files.map((entry) => (
        <FileTreeNode
          key={entry.id}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

const FileTreeNode = React.memo(function FileTreeNode({
  entry,
  depth,
  selectedPath,
  onSelect,
  onContextMenu,
}: {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (file: FileEntry) => void;
  onContextMenu?: (e: React.MouseEvent, entry: FileEntry | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDir = entry.type === "directory";
  const isSelected = entry.path === selectedPath;

  function handleClick() {
    if (isDir) {
      setExpanded(!expanded);
    } else {
      onSelect(entry);
    }
  }

  const FileIcon = getTreeFileIcon(entry, expanded);
  const iconColor = isSelected ? "var(--color-blue)" : getTreeFileIconColor(entry);

  return (
    <div>
      <button
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect(entry);
          onContextMenu?.(e, entry);
        }}
        className={`flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left transition-colors ${
          isSelected ? "bg-blue-light text-fg" : "text-fg-2 hover:bg-surface-3 hover:text-fg"
        }`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {/* Expand/collapse arrow for directories */}
        {isDir && (
          <span className="shrink-0" style={{ color: iconColor }}>
            {expanded ? (
              <CaretDownIcon size={12} weight="fill" />
            ) : (
              <CaretRightIcon size={12} weight="fill" />
            )}
          </span>
        )}

        {/* File/folder icon */}
        <span className="shrink-0" style={{ color: iconColor }}>
          <FileIcon size={14} weight={isDir ? "fill" : "regular"} />
        </span>

        <span className="min-w-0 flex-1 truncate text-xs">{entry.name}</span>

        {!isDir && entry.size > 0 && (
          <span className={`shrink-0 text-xs ${isSelected ? "opacity-70" : "text-fg-3"}`}>
            {formatFileSize(entry.size)}
          </span>
        )}
      </button>

      {isDir && expanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeNode
              key={child.id}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
});
