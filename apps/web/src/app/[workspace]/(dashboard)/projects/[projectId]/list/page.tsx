"use client";

import { use } from "react";
import { ListPageView } from "@/components/projects/list-page-view";

export default function ProjectListPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <ListPageView projectId={projectId} />;
}
