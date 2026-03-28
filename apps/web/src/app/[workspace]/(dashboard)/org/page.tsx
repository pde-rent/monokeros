"use client";

import dynamic from "next/dynamic";

const DiagramView = dynamic(
  () => import("@/components/diagram/diagram-view").then((m) => ({ default: m.DiagramView })),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-surface-2" /> },
);

export default function OrgPage() {
  return <DiagramView />;
}
