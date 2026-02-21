'use client';

import { ProjectViewMode } from '@monokeros/types';
import { AgentQueueView } from './agent-queue-view';
import { ProjectPageLayout } from './project-page-layout';

interface Props {
  projectId?: string;
}

export function QueuePageView({ projectId }: Props) {
  return (
    <ProjectPageLayout projectId={projectId} viewMode={ProjectViewMode.QUEUE}>
      {(pv) => (
        <div className="flex-1 overflow-x-auto p-3">
          <AgentQueueView tasks={pv.filteredTasks} onTaskClick={pv.setSelectedTaskId} />
        </div>
      )}
    </ProjectPageLayout>
  );
}
