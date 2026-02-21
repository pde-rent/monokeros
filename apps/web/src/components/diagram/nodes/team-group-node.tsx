import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Badge } from '@monokeros/ui';

function TeamGroupNodeComponent({ data }: NodeProps) {
  const { label, teamColor, agentCount } = data as {
    label: string;
    teamColor: string;
    agentCount: number;
  };

  return (
    <div
      className="h-full w-full border border-edge bg-elevated/30 rounded-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: teamColor }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-edge">
        <span className="text-xs font-semibold" style={{ color: teamColor }}>
          {label}
        </span>
        <Badge className="bg-elevated">{agentCount}</Badge>
      </div>
    </div>
  );
}

export const TeamGroupNode = memo(TeamGroupNodeComponent);
