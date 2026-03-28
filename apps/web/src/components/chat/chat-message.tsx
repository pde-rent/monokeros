import React from "react";
import { MessageRole } from "@monokeros/types";
import type { ChatMessage, MessageAttachment, MessageReaction } from "@monokeros/types";
import {
  MessageBubble,
  MessageListRow,
  MessageActions,
  MessageReactions,
} from "@monokeros/ui";
import { formatTimestamp } from "@monokeros/utils";
import { AttachmentPreview } from "./attachment-preview";
import { MENTION_TYPE_MAP } from "./chat-constants";

interface MessageProps {
  message: ChatMessage;
  reactions: MessageReaction[];
  layout: "bubbles" | "list";
  onPreviewAttachment: (att: MessageAttachment) => void;
  onCopy: () => void;
  onReply: () => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
}

export const Message = React.memo(function Message({
  message,
  reactions,
  layout,
  onPreviewAttachment,
  onCopy,
  onReply,
  onForward,
  onReact,
}: MessageProps) {
  const isUser = message.role === MessageRole.USER;
  const isSystem = message.role === MessageRole.SYSTEM;
  const attachments = message.attachments ?? [];

  if (isSystem) {
    return layout === "bubbles" ? (
      <div className="text-center text-xs text-fg-3">{message.content}</div>
    ) : (
      <div className="section-border px-4 py-1.5 text-center text-xs text-fg-3 bg-surface-3">
        {message.content}
      </div>
    );
  }

  // Render content: use renderedHtml for agent messages, plain text with mentions for user
  const contentElement =
    !isUser && message.renderedHtml ? (
      <div
        className="rendered-markdown"
        dangerouslySetInnerHTML={{ __html: message.renderedHtml }}
      />
    ) : (
      <span className="whitespace-pre-wrap break-words">{renderContent(message.content)}</span>
    );

  if (layout === "bubbles") {
    if (isUser) {
      return (
        <MessageBubble
          variant="user"
          reactions={reactions}
          onCopy={onCopy}
          onReply={onReply}
          onForward={onForward}
          onReact={onReact}
        >
          {contentElement}
          {attachments.length > 0 && (
            <div className="flex flex-col gap-1">
              {attachments.map((att) => (
                <AttachmentPreview key={att.id} attachment={att} onPreview={onPreviewAttachment} />
              ))}
            </div>
          )}
          <div className="mt-1 text-xs text-blue">{formatTimestamp(message.timestamp)}</div>
        </MessageBubble>
      );
    }

    // Assistant: plain inline markdown, no bubble
    return (
      <div className="group relative max-w-[80%]">
        {/* Hover actions toolbar */}
        <MessageActions
          onCopy={onCopy}
          onReply={onReply}
          onForward={onForward}
          onReact={onReact}
          className="-right-2 bottom-0"
        />
        {contentElement}
        {attachments.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {attachments.map((att) => (
              <AttachmentPreview key={att.id} attachment={att} onPreview={onPreviewAttachment} />
            ))}
          </div>
        )}
        <div className="mt-1 text-xs text-fg-3">{formatTimestamp(message.timestamp)}</div>
        {/* Reactions */}
        {reactions.length > 0 && onReact && (
          <div className="flex justify-start -mt-1">
            <MessageReactions reactions={reactions} onReact={onReact} />
          </div>
        )}
      </div>
    );
  }

  // List layout with MessageListRow
  return (
    <MessageListRow
      isUser={isUser}
      timestamp={formatTimestamp(message.timestamp)}
      reactions={reactions}
      onCopy={onCopy}
      onReply={onReply}
      onForward={onForward}
      onReact={onReact}
    >
      {contentElement}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {attachments.map((att) => (
            <AttachmentPreview key={att.id} attachment={att} onPreview={onPreviewAttachment} />
          ))}
        </div>
      )}
    </MessageListRow>
  );
});

export function renderContent(content: string) {
  // Highlight @mentions, #projects, ~tasks, :files
  const parts = content.split(/([@#~:]\w[\w.-]*)/g);
  return parts.map((part, i) => {
    const prefix = part[0];
    const meta = MENTION_TYPE_MAP[prefix];
    if (meta) {
      const name = part.slice(1);
      return (
        <span
          key={i}
          className={`mention cursor-pointer font-semibold ${meta.className} hover:underline`}
          data-mention-type={meta.type}
          data-mention-name={name}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}
