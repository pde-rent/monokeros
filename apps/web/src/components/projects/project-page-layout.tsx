'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { ProjectViewMode } from '@monokeros/types';
import { useProjectPageView } from '@/hooks/use-project-page-view';
import { ProjectFilterPanel } from './project-filter-panel';
import { CreateTaskDialog } from './create-task-dialog';
import { useRegisterFab, type FabAction } from '@/components/shared/fab-context';
import { PlusIcon } from '@phosphor-icons/react';
import { CollapsiblePanel, useCollapsiblePanel, PANEL_CONSTANTS } from '@/components/layout/collapsible-panel';
import { usePopoutPortal } from '@/components/common/popout-portal';

function ResizeHandle() {
  return (
    <Separator className="group relative flex items-center justify-center w-px bg-edge hover:bg-blue transition-colors">
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
    </Separator>
  );
}

interface Props {
  projectId?: string;
  viewMode: ProjectViewMode;
  filterChildren?: ReactNode;
  /** Hide the popout button (e.g. when already in a popout) */
  isPopout?: boolean;
  children: (pv: ReturnType<typeof useProjectPageView>) => ReactNode;
}

export function ProjectPageLayout({ projectId, viewMode, filterChildren, isPopout, children }: Props) {
  const pv = useProjectPageView(projectId);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const filterPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH);
  const projectPopout = usePopoutPortal({ width: 1000, height: 700 });

  const fabConfig = useMemo(() => {
    if (!pv.activeProjectId) return null;
    return {
      actions: [{
        id: 'new-task',
        label: 'New Task',
        icon: PlusIcon,
        onClick: () => setShowCreateTask(true),
      }] as FabAction[],
      tooltip: 'New Task',
    };
  }, [pv.activeProjectId]);
  useRegisterFab(fabConfig);

  return (
    <Group orientation="horizontal" className="h-full">
      <Panel
        id="filters"
        defaultSize={`${PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH}px`}
        minSize={`${PANEL_CONSTANTS.NOTCH_WIDTH}px`}
        maxSize={`${PANEL_CONSTANTS.MAX_EXPANDED_WIDTH}px`}
        className="overflow-hidden"
        panelRef={(ref) => { filterPanel.ref.current = ref; }}
      >
        <CollapsiblePanel
          title="Filters"
          side="left"
          collapsed={filterPanel.collapsed}
          onToggleCollapse={filterPanel.toggleCollapse}
        >
          <ProjectFilterPanel
            activeProjectId={pv.activeProjectId}
            onProjectChange={pv.setActiveProjectId}
            statusFilter={pv.statusFilter}
            onStatusFilterChange={pv.setStatusFilter}
            typeFilter={pv.typeFilter}
            onTypeFilterChange={pv.setTypeFilter}
            search={pv.search}
            onSearchChange={pv.setSearch}
            viewMode={viewMode}
            onViewModeChange={pv.handleViewModeChange}
            onPopout={isPopout ? undefined : () => projectPopout.open()}
          >
            {filterChildren}
          </ProjectFilterPanel>
        </CollapsiblePanel>
      </Panel>
      <ResizeHandle />
      <Panel id="content" minSize="400px" className="overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden">
          {children(pv)}
        </div>
      </Panel>

      {pv.activeProjectId && (
        <CreateTaskDialog
          open={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          projectId={pv.activeProjectId}
        />
      )}

      {projectPopout.isOpen && projectPopout.render(
        <div className="h-full w-full overflow-hidden bg-surface">
          <ProjectPageLayout
            projectId={projectId}
            viewMode={viewMode}
            filterChildren={filterChildren}
            isPopout
          >
            {children}
          </ProjectPageLayout>
        </div>
      )}
    </Group>
  );
}
