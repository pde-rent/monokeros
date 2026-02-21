'use client';

import React from 'react';
import { CopyIcon, ArrowBendUpLeftIcon, ArrowBendUpRightIcon, SmileyIcon } from '@phosphor-icons/react';

/** Quick reaction emojis - displayed inline like Slack/Discord */
const QUICK_EMOJIS = ['👍', '❤️', '🙏', '💯', '🔥', '😂', '😆', '😢', '👎', '👀'] as const;

interface MessageActionsProps {
  onCopy?: () => void;
  onReply?: () => void;
  onForward?: () => void;
  onReact?: (emoji: string) => void;
  className?: string;
}

export function MessageActions({ onCopy, onReply, onForward, onReact, className = '' }: MessageActionsProps) {
  return (
    <div className={`absolute flex items-center gap-0.5 rounded-sm border border-edge bg-elevated px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm ${className}`}>
      {/* Quick reactions - full list inline */}
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact?.(emoji)}
          title={`React with ${emoji}`}
          aria-label={`React with ${emoji}`}
          className="p-0.5 text-sm hover:bg-surface-3 rounded-sm"
        >
          {emoji}
        </button>
      ))}

      {/* More reactions button (for future emoji picker) */}
      <button
        onClick={() => {/* TODO: Open full emoji picker */}}
        title="More reactions"
        aria-label="More reactions"
        className="p-0.5 text-xs text-fg-2 hover:text-fg hover:bg-surface-3 rounded-sm"
      >
        <SmileyIcon size={14} />
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-edge mx-0.5" aria-hidden="true" />

      {/* Action buttons */}
      <button
        onClick={onCopy}
        title="Copy"
        disabled={!onCopy}
        aria-label="Copy message"
        className="p-0.5 text-xs text-fg-2 hover:text-fg hover:bg-surface-3 rounded-sm disabled:opacity-50"
      >
        <CopyIcon size={14} />
      </button>
      <button
        onClick={onReply}
        title="Reply"
        disabled={!onReply}
        aria-label="Reply to message"
        className="p-0.5 text-xs text-fg-2 hover:text-fg hover:bg-surface-3 rounded-sm disabled:opacity-50"
      >
        <ArrowBendUpLeftIcon size={14} />
      </button>
      <button
        onClick={onForward}
        title="Forward"
        disabled={!onForward}
        aria-label="Forward message"
        className="p-0.5 text-xs text-fg-2 hover:text-fg hover:bg-surface-3 rounded-sm disabled:opacity-50"
      >
        <ArrowBendUpRightIcon size={14} />
      </button>
    </div>
  );
}
