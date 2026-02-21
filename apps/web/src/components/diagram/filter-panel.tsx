'use client';

import { useDiagramStore } from '@/stores/diagram-store';
import { useProjects } from '@/hooks/use-queries';
import { useToggleFilter } from '@/hooks/use-toggle-filter';
import { DiagramViewMode, MemberStatus } from '@monokeros/types';
import { MEMBER_STATUS_LABELS, MEMBER_STATUS_COLORS, DIAGRAM_VIEW_MODE_LABELS } from '@monokeros/constants';
import { useTeams } from '@/hooks/use-queries';
import { GraphIcon, TableIcon, UsersThreeIcon, BuildingsIcon, BriefcaseIcon, ArrowsOutIcon } from '@phosphor-icons/react';
import { ToggleGroup, NavButton, DropdownSelect } from '@monokeros/ui';
import { FilterPanelShell, FilterSection } from '@/components/shared/filter-panel-shell';
import { FilterChip } from '@/components/shared/filter-chip';

const VIEW_MODE_ICONS: Record<DiagramViewMode, React.ReactNode> = {
  [DiagramViewMode.WORKFORCE]: <UsersThreeIcon size={14} />,
  [DiagramViewMode.MANAGEMENT]: <BuildingsIcon size={14} />,
  [DiagramViewMode.PROJECT]: <BriefcaseIcon size={14} />,
};

const viewModes = Object.values(DiagramViewMode).map((v) => ({
  value: v,
  label: DIAGRAM_VIEW_MODE_LABELS[v],
  icon: VIEW_MODE_ICONS[v],
}));
const memberStatuses = Object.values(MemberStatus);

const displayOptions = [
  { value: 'diagram' as const, label: 'Diagram', icon: <GraphIcon size={14} /> },
  { value: 'table' as const, label: 'Table', icon: <TableIcon size={14} /> },
];

interface FilterPanelProps {
  onPopout?: () => void;
}

export function FilterPanel({ onPopout }: FilterPanelProps) {
  const {
    viewMode,
    setViewMode,
    displayMode,
    setDisplayMode,
    teamFilter,
    setTeamFilter,
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
    search,
    setSearch,
  } = useDiagramStore();
  const { data: teams } = useTeams();
  const { data: projects } = useProjects();

  const toggleTeam = useToggleFilter(teamFilter, setTeamFilter);
  const toggleStatus = useToggleFilter(statusFilter, setStatusFilter);

  const projectOptions = [
    { value: '', label: 'All Projects' },
    ...(projects?.map((p) => ({ value: p.id, label: p.name })) ?? []),
  ];

  return (
    <FilterPanelShell search={search} onSearchChange={setSearch} searchPlaceholder="Search agents...">
      <FilterSection>
        <div className="px-2">
          <div className="flex border border-edge rounded-sm">
            <ToggleGroup className="flex-1" options={displayOptions} value={displayMode} onChange={setDisplayMode} />
            {onPopout && (
              <button
                onClick={onPopout}
                title="Pop out diagram"
                className="flex items-center justify-center border-l border-edge px-2 text-fg-2 hover:text-fg transition-colors"
              >
                <ArrowsOutIcon size={14} />
              </button>
            )}
          </div>
        </div>
      </FilterSection>

      {/* View Mode */}
      <FilterSection label="View">
        <div className="divide-y divide-edge">
          {viewModes.map((mode) => (
            <NavButton
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              isActive={viewMode === mode.value}
              className="flex items-center gap-1.5"
            >
              {mode.icon}
              {mode.label}
            </NavButton>
          ))}
        </div>
      </FilterSection>

      {/* Team Filter */}
      <FilterSection label="Teams">
        <div className="flex flex-wrap gap-1 px-3">
          {teams?.map((team) => (
            <FilterChip
              key={team.type}
              label={team.name}
              color={team.color}
              isActive={teamFilter.length === 0 || teamFilter.includes(team.type)}
              onClick={() => toggleTeam(team.type)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Status Filter */}
      <FilterSection label="Status">
        <div className="flex flex-wrap gap-1 px-3">
          {memberStatuses.map((status) => (
            <FilterChip
              key={status}
              label={MEMBER_STATUS_LABELS[status]}
              color={MEMBER_STATUS_COLORS[status]}
              isActive={statusFilter.length === 0 || statusFilter.includes(status)}
              onClick={() => toggleStatus(status)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Project Filter (Project view only) */}
      {viewMode === DiagramViewMode.PROJECT && (
        <FilterSection label="Project">
          <div className="px-3">
            <DropdownSelect
              value={projectFilter ?? ''}
              onChange={(v) => setProjectFilter(v || null)}
              options={projectOptions}
              size="compact"
            />
          </div>
        </FilterSection>
      )}
    </FilterPanelShell>
  );
}
