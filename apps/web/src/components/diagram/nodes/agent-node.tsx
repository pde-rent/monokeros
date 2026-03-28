import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MemberStatus } from "@monokeros/types";
import { StatusBadge, StatusIndicator } from "@monokeros/ui";

function AgentNodeComponent({ data }: NodeProps) {
  const { name, specialization, status, avatarUrl, highlighted, faded, projects, isSystem } =
    data as {
      name: string;
      specialization: string;
      status: MemberStatus;
      teamColor: string;
      avatarUrl?: string | null;
      highlighted?: boolean;
      faded?: boolean;
      projects?: { name: string; color: string }[];
      isSystem?: boolean;
    };

  return (
    <div
      className={`w-[160px] border bg-elevated p-2.5 transition-all rounded-sm ${
        highlighted ? "border-blue shadow-lg" : isSystem ? "border-purple/40" : "border-edge"
      }`}
      style={{ opacity: faded ? 0.3 : 1 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-edge" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {avatarUrl && (
            <img src={avatarUrl} alt={name} className="h-5 w-5 shrink-0 rounded-sm object-cover" />
          )}
          <span className="text-xs font-medium text-fg">{name}</span>
          {isSystem && (
            <span className="shrink-0 rounded px-1 py-px text-[7px] font-medium leading-tight bg-purple/10 text-purple">
              SYS
            </span>
          )}
        </div>
        <StatusIndicator status={status} size="sm" />
      </div>

      <div className="mt-1 text-[10px] text-fg-2">{specialization}</div>

      {projects && projects.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {projects.map((p) => (
            <StatusBadge
              key={p.name}
              label={p.name}
              color={p.color}
              className="text-[9px] px-1 py-0.5"
            />
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-edge" />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
