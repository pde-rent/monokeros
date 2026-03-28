"use client";

import { useState, useMemo } from "react";
import type { TeamDrive, MemberDrive, ProjectDrive, WorkspaceDrive } from "@monokeros/types";
import { useMembers, useTeams, useProjects } from "@/hooks/use-queries";
import { getTeamColor } from "@monokeros/constants";
import { TreeStructureIcon, SquaresFourIcon, ListIcon, ArrowsOutIcon } from "@phosphor-icons/react";
import { ToggleGroup, ListRowButton } from "@monokeros/ui";
import { FilterPanelShell, FilterSection } from "@/components/shared/filter-panel-shell";
import { DriveAvatar } from "./drive-avatar";
import type { FilesViewMode, DriveSelection } from "./files-page";

interface Props {
  teamDrives: TeamDrive[];
  memberDrives: MemberDrive[];
  projectDrives: ProjectDrive[];
  workspaceDrive: WorkspaceDrive | null;
  active: DriveSelection | null;
  onSelect: (selection: DriveSelection) => void;
  viewMode: FilesViewMode;
  onViewModeChange: (mode: FilesViewMode) => void;
  onPopout?: () => void;
  onContextMenu?: (e: React.MouseEvent, selection: DriveSelection, name: string) => void;
}

const viewOptions = [
  { value: "tree" as const, label: "Tree", icon: <TreeStructureIcon size={14} /> },
  { value: "grid" as const, label: "Grid", icon: <SquaresFourIcon size={14} /> },
  { value: "list" as const, label: "List", icon: <ListIcon size={14} /> },
];

export function DriveSidebar({
  teamDrives,
  memberDrives,
  projectDrives,
  workspaceDrive,
  active,
  onSelect,
  viewMode,
  onViewModeChange,
  onPopout,
  onContextMenu,
}: Props) {
  const { data: members } = useMembers();
  const { data: teams } = useTeams();
  const { data: projects } = useProjects();
  const [search, setSearch] = useState("");

  const filteredTeams = useMemo(() => {
    if (!search) return teamDrives;
    const q = search.toLowerCase();
    return teamDrives.filter((w) => w.name.toLowerCase().includes(q));
  }, [teamDrives, search]);

  const filteredMembers = useMemo(() => {
    if (!search) return memberDrives;
    const q = search.toLowerCase();
    return memberDrives.filter((w) => w.memberName.toLowerCase().includes(q));
  }, [memberDrives, search]);

  const filteredProjects = useMemo(() => {
    if (!search) return projectDrives;
    const q = search.toLowerCase();
    return projectDrives.filter((w) => w.name.toLowerCase().includes(q));
  }, [projectDrives, search]);

  const showWorkspace = !search || "workspace".includes(search.toLowerCase());

  return (
    <FilterPanelShell
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search files..."
    >
      <FilterSection>
        <div className="px-2">
          <div className="flex border border-edge rounded-sm">
            <ToggleGroup
              className="flex-1"
              options={viewOptions}
              value={viewMode}
              onChange={onViewModeChange}
            />
            {onPopout && (
              <button
                onClick={onPopout}
                title="Pop out files"
                className="flex items-center justify-center border-l border-edge px-2 text-fg-2 hover:text-fg transition-colors"
              >
                <ArrowsOutIcon size={14} />
              </button>
            )}
          </div>
        </div>
      </FilterSection>

      {/* Workspace Shared Drive */}
      {workspaceDrive && showWorkspace && (
        <FilterSection label="Workspace">
          <div className="divide-y divide-edge">
            <ListRowButton
              onClick={() => onSelect({ category: "workspace", id: "workspace" })}
              onContextMenu={(e) =>
                onContextMenu?.(e, { category: "workspace", id: "workspace" }, "Shared Drive")
              }
              isActive={active?.category === "workspace"}
            >
              <DriveAvatar name="Workspace" color="var(--color-blue)" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">Shared Drive</div>
              </div>
            </ListRowButton>
          </div>
        </FilterSection>
      )}

      {/* Project Drives */}
      {filteredProjects.length > 0 && (
        <FilterSection label="Projects">
          <div className="divide-y divide-edge">
            {filteredProjects.map((pd) => {
              const project = projects?.find((p) => p.id === pd.projectId);
              const isActive = active?.category === "project" && active.id === pd.projectId;

              return (
                <ListRowButton
                  key={pd.projectId}
                  onClick={() => onSelect({ category: "project", id: pd.projectId })}
                  onContextMenu={(e) =>
                    onContextMenu?.(e, { category: "project", id: pd.projectId }, pd.name)
                  }
                  isActive={isActive}
                >
                  <DriveAvatar name={pd.name} color={project?.color ?? "var(--color-purple)"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{pd.name}</div>
                  </div>
                </ListRowButton>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* Team Drives */}
      <FilterSection label="Teams">
        <div className="divide-y divide-edge">
          {filteredTeams.length === 0 ? (
            <p className="text-xs text-fg-3 py-2 text-center">No teams</p>
          ) : (
            filteredTeams.map((ws) => {
              const team = teams?.find((t) => t.id === ws.teamId);
              const isActive = active?.category === "team" && active.id === ws.teamId;

              return (
                <ListRowButton
                  key={ws.teamId}
                  onClick={() => onSelect({ category: "team", id: ws.teamId })}
                  onContextMenu={(e) =>
                    onContextMenu?.(e, { category: "team", id: ws.teamId }, ws.name)
                  }
                  isActive={isActive}
                >
                  <DriveAvatar name={ws.name} color={getTeamColor(team)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{ws.name}</div>
                  </div>
                </ListRowButton>
              );
            })
          )}
        </div>
      </FilterSection>

      <FilterSection label="Members">
        <div className="divide-y divide-edge">
          {filteredMembers.length === 0 ? (
            <p className="text-xs text-fg-3 py-2 text-center">No members</p>
          ) : (
            filteredMembers.map((ws) => {
              const member = members?.find((a) => a.id === ws.memberId);
              const team = member ? teams?.find((t) => t.id === member.teamId) : null;
              const isActive = active?.category === "member" && active.id === ws.memberId;

              return (
                <ListRowButton
                  key={ws.memberId}
                  onClick={() => onSelect({ category: "member", id: ws.memberId })}
                  onContextMenu={(e) =>
                    onContextMenu?.(e, { category: "member", id: ws.memberId }, ws.memberName)
                  }
                  isActive={isActive}
                >
                  <DriveAvatar
                    name={ws.memberName}
                    avatarUrl={member?.avatarUrl}
                    color={getTeamColor(team)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{ws.memberName}</div>
                  </div>
                </ListRowButton>
              );
            })
          )}
        </div>
      </FilterSection>
    </FilterPanelShell>
  );
}
