'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ProjectViewMode } from '@monokeros/types';
import { KanbanIcon, QueueIcon } from '@phosphor-icons/react';
import { ToggleGroup } from '@monokeros/ui';
import { FilterSection } from '@/components/shared/filter-panel-shell';
import { AgentQueueView } from './agent-queue-view';

const KanbanBoard = dynamic(
  () => import('./kanban-board').then((m) => ({ default: m.KanbanBoard })),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-surface-2" /> },
);
import { ProjectPageLayout } from './project-page-layout';

type DisplayMode = 'board' | 'agent-queue';

interface Props {
  projectId?: string;
}

export function KanbanPageView({ projectId }: Props) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('board');

  return (
    <ProjectPageLayout
      projectId={projectId}
      viewMode={ProjectViewMode.KANBAN}
      filterChildren={
        <FilterSection label="Display">
          <div className="flex items-center gap-1.5">
            <ToggleGroup
              className="flex-1"
              options={[
                { value: 'board', label: 'Board', icon: <KanbanIcon size={14} /> },
                { value: 'agent-queue', label: 'Agent Queue', icon: <QueueIcon size={14} /> },
              ]}
              value={displayMode}
              onChange={setDisplayMode}
            />
          </div>
        </FilterSection>
      }
    >
      {(pv) => (
        <div className="flex-1 overflow-x-auto">
          {displayMode === 'board' ? (
            <KanbanBoard tasks={pv.filteredTasks} onTaskClick={pv.setSelectedTaskId} />
          ) : (
            <AgentQueueView tasks={pv.filteredTasks} onTaskClick={pv.setSelectedTaskId} />
          )}
        </div>
      )}
    </ProjectPageLayout>
  );
}
