'use client';

import React from 'react';
import type { MessageReaction } from '@monokeros/types';
import { MessageReactions } from './message-reactions';
import { MessageActions } from './message-actions';

interface MessageListRowProps {
  isUser: boolean;
  timestamp: string;
  children: React.ReactNode;
  reactions?: MessageReaction[];
  onCopy?: () => void;
  onReply?: () => void;
  onForward?: () => void;
  onReact?: (emoji: string) => void;
}

export function MessageListRow({
  isUser,
  timestamp,
  children,
  reactions = [],
  onCopy,
  onReply,
  onForward,
  onReact,
}: MessageListRowProps) {
  return (
    <div className={`group relative flex items-start gap-3 section-border px-4 py-2 ${
      isUser ? 'bg-blue-light' : 'bg-elevated'
    }`}>
      {/* Hover actions - aligned to bottom right */}
      <MessageActions
        onCopy={onCopy}
        onReply={onReply}
        onForward={onForward}
        onReact={onReact}
        className="bottom-1 right-4"
      />

      {/* Message content */}
      <span
        className={`shrink-0 text-[10px] font-medium w-16 pt-0.5 ${
          isUser ? 'text-blue' : 'text-fg-3'
        }`}
      >
        {isUser ? 'You' : 'Agent'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-fg">
          {children}
        </div>
        {reactions.length > 0 && onReact && (
          <MessageReactions reactions={reactions} onReact={onReact} />
        )}
      </div>
      <span className="shrink-0 text-[9px] text-fg-3 pt-0.5">
        {timestamp}
      </span>
    </div>
  );
}
