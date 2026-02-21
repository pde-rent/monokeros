'use client';

import { use } from 'react';
import { GanttPageView } from '@/components/projects/gantt-page-view';

export default function ProjectGanttPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <GanttPageView projectId={projectId} />;
}
