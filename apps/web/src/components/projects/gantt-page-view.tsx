"use client";

import { ProjectViewMode } from "@monokeros/types";
import { useProjects } from "@/hooks/use-queries";
import { GanttChart } from "./gantt-chart";
import { ProjectPageLayout } from "./project-page-layout";

interface Props {
  projectId?: string;
}

export function GanttPageView({ projectId }: Props) {
  const { data: projects } = useProjects();

  return (
    <ProjectPageLayout projectId={projectId} viewMode={ProjectViewMode.GANTT}>
      {(pv) => (
        <GanttChart
          tasks={pv.filteredTasks}
          projects={projects ?? []}
          onTaskClick={pv.setSelectedTaskId}
        />
      )}
    </ProjectPageLayout>
  );
}
