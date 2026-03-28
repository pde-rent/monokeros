"use client";

import { use } from "react";
import { QueuePageView } from "@/components/projects/queue-page-view";

export default function ProjectQueuePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <QueuePageView projectId={projectId} />;
}
