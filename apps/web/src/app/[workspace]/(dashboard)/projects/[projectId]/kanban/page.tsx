'use client';

import { use } from 'react';
import { KanbanPageView } from '@/components/projects/kanban-page-view';

export default function ProjectKanbanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <KanbanPageView projectId={projectId} />;
}
