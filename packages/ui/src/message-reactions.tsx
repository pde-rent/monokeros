import type { MessageReaction } from '@monokeros/types';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReact: (emoji: string) => void;
}

export function MessageReactions({ reactions, onReact }: MessageReactionsProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onReact(reaction.emoji)}
          aria-label={`${reaction.emoji} reaction, ${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}${reaction.reacted ? ', you reacted' : ''}`}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
            reaction.reacted
              ? 'bg-blue-light border border-blue/40 text-blue hover:bg-blue/25'
              : 'bg-surface-3/80 border border-edge/60 text-fg-2 hover:border-edge hover:bg-surface-3'
          }`}
        >
          <span aria-hidden="true" className="text-sm">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
