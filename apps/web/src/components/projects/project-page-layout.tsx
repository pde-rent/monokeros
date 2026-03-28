"use client";

import { useState, type ReactNode } from "react";
import { Panel, Group } from "react-resizable-panels";
import { ProjectViewMode } from "@monokeros/types";
import { useProjectPageView } from "@/hooks/use-project-page-view";
import { ProjectFilterPanel } from "./project-filter-panel";
import { useRegisterFab } from "@/components/shared/fab-context";
import { ListPlusIcon, PlusIcon } from "@phosphor-icons/react";
import { Dialog } from "@monokeros/ui";
import { useCreateTask } from "@/hooks/use-queries";
import { CreateTaskForm } from "./create-task-form";
import { useWorkspaceId } from "@/hooks/use-workspace";
import {
  CollapsibleSidePanel,
  useCollapsiblePanel,
  PANEL_CONSTANTS,
} from "@/components/layout/collapsible-panel";
import { usePopoutPortal } from "@/components/common/popout-portal";
import { ResizeHandle } from "@/components/layout/resizable-layout";

interface Props {
  projectId?: string;
  viewMode: ProjectViewMode;
  filterChildren?: ReactNode;
  /** Hide the popout button (e.g. when already in a popout) */
  isPopout?: boolean;
  children: (pv: ReturnType<typeof useProjectPageView>) => ReactNode;
}

export function ProjectPageLayout({
  projectId,
  viewMode,
  filterChildren,
  isPopout,
  children,
}: Props) {
  const pv = useProjectPageView(projectId);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const wid = useWorkspaceId();
  const createTask = useCreateTask();
  const filterPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH);
  const projectPopout = usePopoutPortal({ width: 1000, height: 700 });

  useRegisterFab(() => {
    if (!pv.activeProjectId) return null;
    return {
      actions: [
        { id: "new-task", label: "New Task", icon: PlusIcon, onClick: () => setShowCreateTask(true) },
      ],
      tooltip: "New Task",
    };
  }, [pv.activeProjectId]);

  return (
    <Group orientation="horizontal" className="h-full">
      <CollapsibleSidePanel id="filters" title="Filters" side="left" panel={filterPanel}>
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
          onPopout={isPopout ? undefined : () => projectPopout.open(
            <div className="h-full w-full overflow-hidden bg-surface">
              <ProjectPageLayout
                projectId={projectId}
                viewMode={viewMode}
                filterChildren={filterChildren}
                isPopout
              >
                {children}
              </ProjectPageLayout>
            </div>,
          )}
        >
          {filterChildren}
        </ProjectFilterPanel>
      </CollapsibleSidePanel>
      <ResizeHandle />
      <Panel id="content" minSize="400px" className="overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden">{children(pv)}</div>
      </Panel>

      {pv.activeProjectId && (
        <Dialog
          open={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          title="New Task"
          icon={<ListPlusIcon size={14} weight="bold" />}
          width={520}
        >
          <CreateTaskForm
            projectId={pv.activeProjectId}
            onSubmit={(data: Record<string, any>) => {
              createTask.mutate({ workspaceId: wid!, ...data } as any, {
                onSuccess: () => setShowCreateTask(false),
              });
            }}
            onCancel={() => setShowCreateTask(false)}
            isSubmitting={createTask.isPending}
          />
        </Dialog>
      )}

    </Group>
  );
}
