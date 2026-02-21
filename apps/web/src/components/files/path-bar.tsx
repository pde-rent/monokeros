'use client';

import { useState, useRef, useEffect } from 'react';
import { CaretRightIcon, FolderOpenIcon } from '@phosphor-icons/react';

interface Props {
  segments: string[];
  onNavigate: (depth: number) => void;
}

export function PathBar({ segments, onNavigate }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleStartEdit() {
    setEditValue('/' + segments.join('/'));
    setEditing(true);
  }

  function handleSubmitEdit() {
    setEditing(false);
    // Parse the typed path and navigate
    const parts = editValue.split('/').filter(Boolean);
    // Find how deep we need to go
    for (let i = 0; i < parts.length && i < segments.length; i++) {
      if (parts[i] !== segments[i]) {
        onNavigate(i);
        return;
      }
    }
    onNavigate(parts.length);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSubmitEdit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  }

  return (
    <div
      className="flex h-7 shrink-0 items-center gap-0.5 border-b border-edge bg-surface px-2 text-xs"
      onClick={(e) => {
        // Click on background (not on a segment) to edit
        if (e.target === e.currentTarget && !editing) {
          handleStartEdit();
        }
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmitEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-xs text-fg font-mono outline-none"
        />
      ) : (
        <>
          <button
            onClick={() => handleStartEdit()}
            className="shrink-0 text-fg-3 hover:text-fg"
          >
            <FolderOpenIcon size={14} weight="fill" />
          </button>

          {/* Root segment */}
          <button
            onClick={() => onNavigate(0)}
            className="shrink-0 px-1 text-fg-2 hover:text-blue"
          >
            Root
          </button>

          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <CaretRightIcon size={10} className="shrink-0 text-fg-3" />
              <button
                onClick={() => onNavigate(i + 1)}
                className="shrink-0 px-1 text-fg-2 hover:text-blue"
              >
                {seg}
              </button>
            </span>
          ))}
        </>
      )}
    </div>
  );
}
