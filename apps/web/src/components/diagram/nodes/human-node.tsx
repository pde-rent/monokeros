import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { getInitials } from '@monokeros/ui';

function HumanNodeComponent({ data }: NodeProps) {
  const { name, title, avatarUrl, supervisedCount } = data as {
    name: string;
    title: string;
    avatarUrl?: string | null;
    supervisedCount: number;
  };

  return (
    <div className="w-[160px] border-2 border-purple/50 bg-elevated p-2.5 rounded-sm">
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-8 w-8 shrink-0 rounded-sm object-cover" />
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center text-xs font-bold text-fg-inverse rounded-sm"
            style={{ backgroundColor: 'var(--color-purple)' }}
          >
            {getInitials(name)}
          </div>
        )}
        <div>
          <div className="text-xs font-semibold text-fg">{name}</div>
          <div className="text-[10px] text-fg-2">{title}</div>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-purple">
        Supervises {supervisedCount} teams
      </div>

      <Handle type="source" position={Position.Bottom} style={{ backgroundColor: 'var(--color-purple)' }} />
    </div>
  );
}

export const HumanNode = memo(HumanNodeComponent);
