"use client";

import { useUIStore } from "@/stores/ui-store";
import { useMembers, useTeams } from "@/hooks/use-queries";
import type { Member, Team } from "@monokeros/types";
import { TaskDetail } from "./task-detail";
import { ProjectDetail } from "./project-detail";
import { MemberDetail } from "./member-detail";
import { TeamDetail } from "./team-detail";
import { CollapsiblePanel } from "./collapsible-panel";

interface DetailPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function DetailPanel({ collapsed, onToggleCollapse }: DetailPanelProps) {
  const { detailPanel } = useUIStore();
  const { data: members } = useMembers();
  const { data: teams } = useTeams();

  const panelTitle = detailPanel
    ? detailPanel.type === "agent"
      ? "Agent Details"
      : detailPanel.type === "team"
        ? "Team Details"
        : detailPanel.type === "project"
          ? "Project Details"
          : detailPanel.type === "task"
            ? "Task Details"
            : "Details"
    : "Details";

  // Empty state when no panel selected
  if (!detailPanel) {
    return (
      <CollapsiblePanel
        title={panelTitle}
        side="right"
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      >
        <div className="flex h-full items-center justify-center text-xs text-fg-3">
          Select an item to view details
        </div>
      </CollapsiblePanel>
    );
  }

  // For project/task panels, we don't need to pre-fetch the entity here
  const isEntityPanel = detailPanel.type === "agent" || detailPanel.type === "team";
  const entity = isEntityPanel
    ? detailPanel.type === "agent"
      ? members?.find((m) => m.id === detailPanel.entityId)
      : teams?.find((t) => t.id === detailPanel.entityId)
    : null;

  if (isEntityPanel && !entity) return null;

  return (
    <CollapsiblePanel
      title={panelTitle}
      side="right"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      <div className="h-full overflow-y-auto">
        {detailPanel.type === "agent" && entity && (
          <MemberDetail
            member={entity as Member}
            team={teams?.find((t) => t.id === (entity as Member).teamId)}
          />
        )}
        {detailPanel.type === "team" && entity && (
          <TeamDetail
            team={entity as Team}
            members={
              members?.filter((m) => m.type === "agent" && m.teamId === (entity as Team).id) ?? []
            }
          />
        )}
        {detailPanel.type === "project" && <ProjectDetail projectId={detailPanel.entityId} />}
        {detailPanel.type === "task" && <TaskDetail taskId={detailPanel.entityId} />}
      </div>
    </CollapsiblePanel>
  );
}
