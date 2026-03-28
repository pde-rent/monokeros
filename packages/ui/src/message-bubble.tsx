import type { MessageReaction } from "@monokeros/types";
import { MessageActions } from "./message-actions";
import { MessageReactions } from "./message-reactions";

interface MessageBubbleProps {
  variant: "user" | "assistant";
  children: React.ReactNode;
  reactions?: MessageReaction[];
  onCopy?: () => void;
  onReply?: () => void;
  onForward?: () => void;
  onReact?: (emoji: string) => void;
}

export function MessageBubble({
  variant,
  children,
  reactions = [],
  onCopy,
  onReply,
  onForward,
  onReact,
}: MessageBubbleProps) {
  const hasActions = onCopy || onReply || onForward || onReact;
  const hasReactions = reactions.length > 0 && onReact;

  return (
    <div className={`flex ${variant === "user" ? "justify-end" : "justify-start"}`}>
      <div className="group relative max-w-[80%]">
        {/* Hover actions toolbar - positioned below bubble */}
        {hasActions && (
          <MessageActions
            onCopy={onCopy || (() => {})}
            onReply={onReply || (() => {})}
            onForward={onForward || (() => {})}
            onReact={onReact || (() => {})}
            className={`${variant === "user" ? "-left-2" : "-right-2"} bottom-0`}
          />
        )}

        {/* Message bubble */}
        <div
          className={`px-3 py-2 rounded-lg ${
            variant === "user" ? "bg-blue-light text-fg" : "bg-elevated border border-edge text-fg"
          }`}
        >
          {children}
        </div>

        {/* Reactions - positioned below bubble, aligned to start/end based on variant */}
        {hasReactions && (
          <div className={`flex ${variant === "user" ? "justify-end" : "justify-start"} -mt-1`}>
            <MessageReactions reactions={reactions} onReact={onReact} />
          </div>
        )}
      </div>
    </div>
  );
}
