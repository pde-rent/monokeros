'use client';

import { ProjectViewMode } from '@monokeros/types';
import { TaskTable } from './task-table';
import { ProjectPageLayout } from './project-page-layout';

interface Props {
  projectId?: string;
}

export function ListPageView({ projectId }: Props) {
  return (
    <ProjectPageLayout projectId={projectId} viewMode={ProjectViewMode.LIST}>
      {(pv) => (
        <TaskTable tasks={pv.filteredTasks} onTaskClick={pv.setSelectedTaskId} />
      )}
    </ProjectPageLayout>
  );
}
