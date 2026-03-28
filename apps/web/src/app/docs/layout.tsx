"use client";

import { TopNav } from "@/components/layout/top-nav";
import { StatusBar } from "@/components/layout/status-bar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <TopNav />
      <main className="flex-1 overflow-hidden bg-surface">{children}</main>
      <StatusBar />
    </div>
  );
}
