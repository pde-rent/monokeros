import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CrownIcon } from "@phosphor-icons/react";
import type { MemberStatus } from "@monokeros/types";
import { StatusBadge, StatusIndicator } from "@monokeros/ui";

function LeadAgentNodeComponent({ data }: NodeProps) {
  const {
    name,
    title,
    status,
    teamColor,
    avatarUrl,
    stats,
    highlighted,
    faded,
    currentProjectId,
    projects,
  } = data as {
    name: string;
    title: string;
    status: MemberStatus;
    teamColor: string;
    avatarUrl?: string | null;
    stats: { tasksCompleted: number; avgAgreementScore: number };
    highlighted?: boolean;
    faded?: boolean;
    currentProjectId: string | null;
    projects?: { name: string; color: string }[];
  };

  return (
    <div
      className={`w-[180px] border bg-elevated p-3 transition-all rounded-sm ${
        highlighted ? "border-blue shadow-lg" : "border-edge"
      }`}
      style={{ opacity: faded ? 0.3 : 1 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-edge" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-5 w-5 shrink-0 rounded-sm object-cover" />
          ) : (
            <CrownIcon size={16} weight="fill" className="text-yellow" />
          )}
          <span className="text-xs font-semibold text-fg">{name}</span>
        </div>
        <StatusIndicator status={status} size="md" />
      </div>

      <div className="mt-1 text-[10px] text-fg-2">{title}</div>

      {projects && projects.length > 0 ? (
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
      ) : currentProjectId ? (
        <StatusBadge label="Active Project" color={teamColor} className="mt-2" />
      ) : null}

      <div className="mt-2 flex gap-3 border-t border-edge pt-2 text-[10px] text-fg-2">
        <span>{stats.tasksCompleted} done</span>
        <span>{stats.avgAgreementScore}% avg</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-edge" />
    </div>
  );
}

export const LeadAgentNode = memo(LeadAgentNodeComponent);
