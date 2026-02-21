'use client';

import { useState, useEffect } from 'react';
import { useProjects } from '@/hooks/use-queries';
import { useToggleFilter } from '@/hooks/use-toggle-filter';
import { TaskStatus, ProjectViewMode } from '@monokeros/types';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@monokeros/constants';
import { formatLabel } from '@monokeros/utils';
import { KanbanIcon, ChartBarIcon, ListIcon, QueueIcon, ArrowsOutIcon } from '@phosphor-icons/react';
import { NavButton } from '@monokeros/ui';
import { FilterPanelShell, FilterSection } from '@/components/shared/filter-panel-shell';
import { FilterChip } from '@/components/shared/filter-chip';

const taskStatuses = Object.values(TaskStatus);

const VIEW_MODE_ICONS: Record<ProjectViewMode, React.ReactNode> = {
  [ProjectViewMode.KANBAN]: <KanbanIcon size={14} />,
  [ProjectViewMode.GANTT]: <ChartBarIcon size={14} />,
  [ProjectViewMode.LIST]: <ListIcon size={14} />,
  [ProjectViewMode.QUEUE]: <QueueIcon size={14} />,
};

export type { ProjectViewMode };

interface Props {
  activeProjectId?: string;
  onProjectChange: (projectId: string | undefined) => void;
  statusFilter: string[];
  onStatusFilterChange: (statuses: string[]) => void;
  typeFilter: string[];
  onTypeFilterChange: (types: string[]) => void;
  search: string;
  onSearchChange: (search: string) => void;
  viewMode?: ProjectViewMode;
  onViewModeChange?: (mode: ProjectViewMode) => void;
  onPopout?: () => void;
  children?: React.ReactNode;
}

export function ProjectFilterPanel({
  activeProjectId,
  onProjectChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onPopout,
  children,
}: Props) {
  const { data: projects } = useProjects();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Derive unique project types from data (only after mount to avoid hydration mismatch)
  const projectTypes = mounted ? [...new Set(projects?.flatMap((p) => p.types) ?? [])] : [];

  const toggleStatus = useToggleFilter(statusFilter, onStatusFilterChange);
  const toggleType = useToggleFilter(typeFilter, onTypeFilterChange);

  return (
    <FilterPanelShell search={search} onSearchChange={onSearchChange} searchPlaceholder="Search tasks...">
      {/* View Mode */}
      {viewMode && onViewModeChange && (
        <FilterSection label="View">
          <div className="divide-y divide-edge">
            {Object.values(ProjectViewMode).map((mode) => (
              <NavButton
                key={mode}
                onClick={() => onViewModeChange(mode)}
                isActive={viewMode === mode}
                className="flex items-center gap-1.5 capitalize"
              >
                {VIEW_MODE_ICONS[mode]}
                {mode}
              </NavButton>
            ))}
          </div>
          {onPopout && (
            <div className="mt-2 px-2">
              <div className="flex border border-edge rounded-sm">
                <button
                  onClick={onPopout}
                  title="Pop out project"
                  className="flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-fg-2 hover:text-fg transition-colors"
                >
                  <ArrowsOutIcon size={14} />
                  Pop Out
                </button>
              </div>
            </div>
          )}
        </FilterSection>
      )}

      {/* Extra controls (e.g. Board/Agent Queue toggle) */}
      {children}

      {/* Project */}
      <FilterSection label="Project">
        <div className="divide-y divide-edge">
          <NavButton
            onClick={() => onProjectChange(undefined)}
            isActive={!activeProjectId}
          >
            All Projects
          </NavButton>
          {mounted && projects?.map((project) => (
            <NavButton
              key={project.id}
              onClick={() => onProjectChange(project.id)}
              isActive={activeProjectId === project.id}
              className="flex items-center gap-1.5"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: project.color }}
              />
              <span className="truncate">{project.name}</span>
            </NavButton>
          ))}
        </div>
      </FilterSection>

      {/* Status Filter */}
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

      {/* Type Filter */}
      <FilterSection label="Type">
        <div className="flex flex-wrap gap-1 px-3">
          {projectTypes.map((type) => (
            <FilterChip
              key={type}
              label={formatLabel(type)}
              color="var(--color-fg-3)"
              isActive={typeFilter.length === 0 || typeFilter.includes(type)}
              onClick={() => toggleType(type)}
            />
          ))}
        </div>
      </FilterSection>
    </FilterPanelShell>
  );
}
