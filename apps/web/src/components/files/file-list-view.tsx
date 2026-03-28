"use client";

import { useState, useMemo } from "react";
import { CaretRightIcon, CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import type { FileEntry } from "@monokeros/types";
import { getListFileIcon } from "@/lib/file-icons";
import { useSort } from "@/hooks/use-sort";
import { formatFileSize, formatDate, getFileTypeLabel } from "@monokeros/utils";

interface Props {
  files: FileEntry[];
  selectedPath: string | null;
  onSelect: (file: FileEntry) => void;
  onContextMenu?: (e: React.MouseEvent, entry: FileEntry | null) => void;
}

type SortField = "name" | "size" | "modifiedAt" | "type";

function compareFiles(a: FileEntry, b: FileEntry, field: SortField, dir: "asc" | "desc"): number {
  if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
  let cmp = 0;
  switch (field) {
    case "name":
      cmp = a.name.localeCompare(b.name);
      break;
    case "size":
      cmp = a.size - b.size;
      break;
    case "modifiedAt":
      cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
      break;
    case "type":
      cmp = a.mimeType.localeCompare(b.mimeType);
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

export function FileListView({ files, selectedPath, onSelect, onContextMenu }: Props) {
  const { sortKey: sortField, sortDir: sortDirection, handleSort } = useSort<SortField>("name");

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => compareFiles(a, b, sortField, sortDirection));
  }, [files, sortField, sortDirection]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="grid grid-cols-[1.5rem_1fr_5rem_7rem_5rem] items-center border-b border-edge bg-surface-2 px-2 py-1.5 text-xs font-medium text-fg-2">
        <div></div>
        <button
          onClick={() => handleSort("name")}
          className="flex items-center gap-1 text-left hover:text-fg"
        >
          Name
          {sortField === "name" &&
            (sortDirection === "asc" ? <CaretUpIcon size={8} /> : <CaretDownIcon size={8} />)}
        </button>
        <button
          onClick={() => handleSort("size")}
          className="flex items-center gap-1 text-right hover:text-fg"
        >
          Size
          {sortField === "size" &&
            (sortDirection === "asc" ? <CaretUpIcon size={8} /> : <CaretDownIcon size={8} />)}
        </button>
        <button
          onClick={() => handleSort("modifiedAt")}
          className="flex items-center gap-1 text-right hover:text-fg"
        >
          Modified
          {sortField === "modifiedAt" &&
            (sortDirection === "asc" ? <CaretUpIcon size={8} /> : <CaretDownIcon size={8} />)}
        </button>
        <button
          onClick={() => handleSort("type")}
          className="flex items-center gap-1 text-right hover:text-fg"
        >
          Type
          {sortField === "type" &&
            (sortDirection === "asc" ? <CaretUpIcon size={8} /> : <CaretDownIcon size={8} />)}
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto"
        onContextMenu={(e) => {
          if (e.target === e.currentTarget && onContextMenu) {
            onContextMenu(e, null);
          }
        }}
      >
        {sortedFiles.map((entry) => (
          <FileListRow
            key={entry.id}
            entry={entry}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
            sortField={sortField}
            sortDirection={sortDirection}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  );
}

function FileListRow({
  entry,
  depth,
  selectedPath,
  onSelect,
  sortField,
  sortDirection,
  onContextMenu,
}: {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (file: FileEntry) => void;
  sortField: SortField;
  sortDirection: "asc" | "desc";
  onContextMenu?: (e: React.MouseEvent, entry: FileEntry | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDir = entry.type === "directory";
  const isSelected = entry.path === selectedPath;

  const sortedChildren = useMemo(() => {
    if (!entry.children) return [];
    return [...entry.children].sort((a, b) => compareFiles(a, b, sortField, sortDirection));
  }, [entry.children, sortField, sortDirection]);

  function handleClick() {
    if (isDir) {
      setExpanded(!expanded);
    }
    onSelect(entry);
  }

  return (
    <div>
      <button
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e, entry);
        }}
        className={`row-hover grid w-full grid-cols-[1.5rem_1fr_5rem_7rem_5rem] items-center px-2 py-1.5 text-left ${
          isSelected ? "bg-blue-light text-fg" : "text-fg"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse or Icon */}
        <div className="flex items-center justify-center">
          {isDir ? (
            expanded ? (
              <CaretDownIcon size={12} weight="fill" className="text-fg-3" />
            ) : (
              <CaretRightIcon size={12} weight="fill" className="text-fg-3" />
            )
          ) : null}
        </div>

        {/* Name with icon */}
        <div className="flex min-w-0 items-center gap-2">
          {(() => {
            const { Icon, color, weight } = getListFileIcon(entry, 16);
            return (
              <Icon size={16} weight={weight} className={`text-[${color}]`} style={{ color }} />
            );
          })()}
          <span className="truncate text-xs">{entry.name}</span>
        </div>

        {/* Size */}
        <span className="text-right text-xs text-fg-2">
          {isDir ? "--" : formatFileSize(entry.size)}
        </span>

        {/* Modified */}
        <span className="text-right text-xs text-fg-2">{formatDate(entry.modifiedAt)}</span>

        {/* Type */}
        <span className="truncate text-right text-xs text-fg-2">
          {getFileTypeLabel(entry.name, isDir)}
        </span>
      </button>

      {isDir && expanded && sortedChildren.length > 0 && (
        <div>
          {sortedChildren.map((child) => (
            <FileListRow
              key={child.id}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              sortField={sortField}
              sortDirection={sortDirection}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
