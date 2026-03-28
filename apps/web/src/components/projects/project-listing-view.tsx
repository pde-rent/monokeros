"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Panel, Group } from "react-resizable-panels";
import { useProjects, useTeams } from "@/hooks/use-queries";
import { useUIStore } from "@/stores/ui-store";
import { TaskStatus } from "@monokeros/types";
import type { Project } from "@monokeros/types";
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@monokeros/constants";
import { formatLabel, formatDate } from "@monokeros/utils";
import { StatusBadge, TableHeader, ToggleGroup } from "@monokeros/ui";
import { FilterPanelShell, FilterSection } from "@/components/shared/filter-panel-shell";
import { FilterChip } from "@/components/shared/filter-chip";
import { useToggleFilter } from "@/hooks/use-toggle-filter";
import { ProjectDialog } from "./project-dialog";
import { useRegisterFab } from "@/components/shared/fab-context";
import {
  PlusIcon,
  SquaresFourIcon,
  TableIcon,
  ArrowsOutIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import {
  CollapsibleSidePanel,
  useCollapsiblePanel,
  PANEL_CONSTANTS,
} from "@/components/layout/collapsible-panel";
import { usePopoutPortal } from "@/components/common/popout-portal";
import { ResizeHandle } from "@/components/layout/resizable-layout";

type ViewMode = "grid" | "table";

const taskStatuses = Object.values(TaskStatus);

interface ProjectListingViewProps {
  /** Hide the popout button (e.g. when already in a popout) */
  isPopout?: boolean;
}

export function ProjectListingView({ isPopout }: ProjectListingViewProps = {}) {
  const router = useRouter();
  const { workspace: slug } = useParams<{ workspace: string }>();
  const { data: projects } = useProjects();
  const { data: teams } = useTeams();
  const { detailPanel, openDetailPanel } = useUIStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const toggleType = useToggleFilter(typeFilter, setTypeFilter);
  const filterPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH);
  const projectsPopout = usePopoutPortal({ width: 1000, height: 700 });

  // Derive unique project types from data
  const projectTypes = useMemo(() => {
    const types = new Set<string>();
    projects?.forEach((p) => p.types.forEach((t) => types.add(t)));
    return [...types];
  }, [projects]);
  const toggleStatus = useToggleFilter(statusFilter, setStatusFilter);

  useRegisterFab(() => ({
    actions: [
      { id: "new-project", label: "New Project", icon: PlusIcon, onClick: () => setShowCreate(true) },
    ],
    tooltip: "New Project",
  }), []);

  const scored = useMemo(() => {
    let result = projects ?? [];
    if (typeFilter.length > 0) {
      result = result.filter((p) => p.types.some((t) => typeFilter.includes(t)));
    }
    if (statusFilter.length > 0) {
      result = result.filter((p) => statusFilter.includes(p.status));
    }
    const q = search.toLowerCase();
    return result
      .map((project) => {
        if (!q) return { project, matched: true, score: 0 };
        const nameMatch = project.name.toLowerCase().includes(q);
        const typeMatch = project.types.some((t) => t.toLowerCase().includes(q));
        const descMatch = project.description?.toLowerCase().includes(q) ?? false;
        const matched = nameMatch || typeMatch || descMatch;
        const score = nameMatch ? 3 : typeMatch ? 2 : descMatch ? 1 : 0;
        return { project, matched, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [projects, search, typeFilter, statusFilter]);

  function selectProject(projectId: string) {
    openDetailPanel("project", projectId);
  }

  function goToProject(projectSlug: string) {
    router.push(`/${slug}/projects/${projectSlug}/kanban`);
  }

  const selectedProjectId = detailPanel?.type === "project" ? detailPanel.entityId : null;

  return (
    <Group orientation="horizontal" className="h-full">
      <CollapsibleSidePanel id="filters" title="Filters" side="left" panel={filterPanel}>
        <FilterPanelShell
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search projects..."
        >
          <FilterSection>
            <div className="px-2">
              <div className="flex border border-edge rounded-sm">
                <ToggleGroup
                  className="flex-1"
                  options={[
                    { value: "grid", label: "Grid", icon: <SquaresFourIcon size={14} /> },
                    { value: "table", label: "Table", icon: <TableIcon size={14} /> },
                  ]}
                  value={viewMode}
                  onChange={setViewMode}
                />
                {!isPopout && (
                  <button
                    onClick={() => projectsPopout.open(
                      <div className="h-full w-full overflow-hidden bg-surface">
                        <ProjectListingView isPopout />
                      </div>,
                    )}
                    title="Pop out projects"
                    className="flex items-center justify-center border-l border-edge px-2 text-fg-2 hover:text-fg transition-colors"
                  >
                    <ArrowsOutIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          </FilterSection>

          <FilterSection label="Status">
            <div className="flex flex-wrap gap-1 px-3">
              {taskStatuses.map((status) => (
                <FilterChip
                  key={status}
                  label={TASK_STATUS_LABELS[status]}
                  color={TASK_STATUS_COLORS[status]}
                  isActive={statusFilter.length === 0 || statusFilter.includes(status)}
                  onClick={() => toggleStatus(status)}
                />
              ))}
            </div>
          </FilterSection>
          <FilterSection label="Type">
            <div className="flex flex-wrap gap-1 px-3">
              {projectTypes.map((type) => (
                <FilterChip
                  key={type}
                  label={formatLabel(type)}
                  color={"var(--color-fg-3)"}
                  isActive={typeFilter.length === 0 || typeFilter.includes(type)}
                  onClick={() => toggleType(type)}
                />
              ))}
            </div>
          </FilterSection>
        </FilterPanelShell>
      </CollapsibleSidePanel>
      <ResizeHandle />
      <Panel id="content" minSize="400px" className="overflow-hidden">
        <div className={`h-full overflow-auto ${viewMode === "grid" ? "p-4" : ""}`}>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scored.map(({ project, matched }) => {
                const projectTeams =
                  teams?.filter((t) => project.assignedTeamIds.includes(t.id)) ?? [];
                return (
                  <div key={project.id} className="group relative">
                    <button
                      onClick={() => selectProject(project.id)}
                      onDoubleClick={() => goToProject(project.slug)}
                      className={`w-full rounded-md border p-4 text-left transition-all hover:border-edge-hover ${
                        selectedProjectId === project.id
                          ? "border-blue bg-blue-light"
                          : "border-edge bg-elevated"
                      }`}
                      style={{ opacity: matched ? 1 : 0.3 }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="text-sm font-semibold text-fg">{project.name}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-fg-2">{project.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {project.types.map((type) => (
                          <StatusBadge
                            key={type}
                            label={formatLabel(type)}
                            color={"var(--color-fg-3)"}
                          />
                        ))}
                        <StatusBadge
                          label={TASK_STATUS_LABELS[project.status as TaskStatus] ?? project.status}
                          color={
                            TASK_STATUS_COLORS[project.status as TaskStatus] ?? "var(--color-idle)"
                          }
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-fg-3">
                        <span>{formatLabel(project.currentPhase)}</span>
                        <span>
                          {projectTeams.length} team{projectTeams.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject(project);
                      }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-fg-3 opacity-0 transition-opacity hover:bg-surface-3 hover:text-fg group-hover:opacity-100"
                      title="Edit project"
                    >
                      <PencilSimpleIcon size={12} weight="bold" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="border-b border-edge">
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Types</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Phase</TableHeader>
                  <TableHeader>Teams</TableHeader>
                  <TableHeader>Created</TableHeader>
                </tr>
              </thead>
              <tbody>
                {scored.map(({ project, matched }) => {
                  const projectTeams =
                    teams?.filter((t) => project.assignedTeamIds.includes(t.id)) ?? [];
                  return (
                    <tr
                      key={project.id}
                      onClick={() => selectProject(project.id)}
                      onDoubleClick={() => goToProject(project.slug)}
                      className={`cursor-pointer transition-colors ${
                        selectedProjectId === project.id ? "bg-blue-light" : "row-hover"
                      }`}
                      style={{ opacity: matched ? 1 : 0.3 }}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="text-xs font-medium text-fg">{project.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {project.types.map((type) => (
                            <StatusBadge
                              key={type}
                              label={formatLabel(type)}
                              color={"var(--color-fg-3)"}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          label={TASK_STATUS_LABELS[project.status as TaskStatus] ?? project.status}
                          color={
                            TASK_STATUS_COLORS[project.status as TaskStatus] ?? "var(--color-idle)"
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-fg-2">
                          {formatLabel(project.currentPhase)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-fg-2">{projectTeams.length}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-fg-3">{formatDate(project.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      <ProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
      {editingProject && (
        <ProjectDialog
          project={editingProject}
          open={true}
          onClose={() => setEditingProject(null)}
        />
      )}

    </Group>
  );
}
