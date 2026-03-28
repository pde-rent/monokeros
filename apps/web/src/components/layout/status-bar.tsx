"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { CaretUpIcon, WifiHighIcon, CircleIcon, MonitorIcon, TerminalWindowIcon } from "@phosphor-icons/react";
import { useMembers, useTasks, useProjects } from "@/hooks/use-queries";
import { MemberStatus, TaskStatus } from "@monokeros/types";
import { LATENCY_PING_INTERVAL_MS } from "@monokeros/constants";
import { StatusIndicator, ColorDot, DropupMenu, DropupMenuItem } from "@monokeros/ui";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";

type ViewMode = "agents-status" | "tasks-status" | "projects-status";

const VIEW_LABELS: Record<ViewMode, string> = {
  "agents-status": "Agents",
  "tasks-status": "Tasks",
  "projects-status": "Projects",
};

const viewModes: ViewMode[] = ["agents-status", "tasks-status", "projects-status"];

function useLatency() {
  const [latency, setLatency] = useState<number | null>(null);

  const ping = useCallback(async () => {
    const start = performance.now();
    try {
      // Ping the Convex endpoint for latency measurement
      await fetch(CONVEX_URL, { method: "HEAD", cache: "no-store" });
      setLatency(Math.round(performance.now() - start));
    } catch {
      setLatency(null);
    }
  }, []);

  useEffect(() => {
    ping();
    const id = setInterval(ping, LATENCY_PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ping]);

  return latency;
}

function latencyColor(ms: number | null): string {
  if (ms === null) return "var(--color-offline)";
  if (ms < 100) return "var(--color-working)";
  if (ms < 300) return "var(--color-reviewing)";
  return "var(--color-blocked)";
}

export function StatusBar() {
  const [viewMode, setViewMode] = useState<ViewMode>("agents-status");
  const { data: members } = useMembers();
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  const latency = useLatency();

  const agents = members?.filter((m) => m.type === "agent");

  const menuItems: DropupMenuItem[] = useMemo(
    () =>
      viewModes.map((mode) => ({
        id: mode,
        label: `${VIEW_LABELS[mode]} by Status`,
        isActive: viewMode === mode,
        onClick: () => setViewMode(mode),
      })),
    [viewMode],
  );

  return (
    <div className="flex h-[var(--layout-status-bar-height)] shrink-0 items-center border-t border-edge bg-surface px-3 text-xs text-fg-2">
      {/* Left: Dropup selector */}
      <DropupMenu
        trigger={
          <button className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 transition-colors hover:bg-surface-3 hover:text-fg">
            <span className="font-medium">{VIEW_LABELS[viewMode]}</span>
            <CaretUpIcon size={10} />
          </button>
        }
        items={menuItems}
      />

      {/* Center: Status counts */}
      <div className="ml-3 flex items-center gap-3 border-l border-edge pl-3">
        {viewMode === "agents-status" && <AgentsByStatus agents={agents} />}
        {viewMode === "tasks-status" && <TasksByStatus tasks={tasks} />}
        {viewMode === "projects-status" && <ProjectsByStatus projects={projects} />}
      </div>

      {/* Right: Connection + latency */}
      <div className="ml-auto flex items-center gap-1.5">
        <WifiHighIcon size={12} />
        <CircleIcon size={6} weight="fill" style={{ color: latencyColor(latency) }} />
        <span>
          {latency !== null ? (
            <>
              <span style={{ color: latencyColor(latency) }}>{latency}ms</span>
            </>
          ) : (
            <span style={{ color: latencyColor(null) }}>Offline</span>
          )}
        </span>
      </div>
    </div>
  );
}

function AgentsByStatus({ agents }: { agents?: ReturnType<typeof useMembers>["data"] }) {
  const counts = {
    active:
      agents?.filter(
        (a) => a.status === MemberStatus.WORKING || a.status === MemberStatus.REVIEWING,
      ).length ?? 0,
    idle: agents?.filter((a) => a.status === MemberStatus.IDLE).length ?? 0,
    blocked: agents?.filter((a) => a.status === MemberStatus.BLOCKED).length ?? 0,
  };
  const desktop = agents?.filter((a) => (a as any).desktop ?? ((a as any).runtime !== "zeroclaw")).length ?? 0;
  const headless = agents?.filter((a) => !((a as any).desktop ?? ((a as any).runtime !== "zeroclaw"))).length ?? 0;
  return (
    <>
      <span className="flex items-center gap-1">
        <StatusIndicator status={MemberStatus.WORKING} size="sm" pulse={false} />
        {counts.active}
      </span>
      <span className="flex items-center gap-1">
        <StatusIndicator status={MemberStatus.IDLE} size="sm" />
        {counts.idle}
      </span>
      <span className="flex items-center gap-1">
        <StatusIndicator status={MemberStatus.BLOCKED} size="sm" />
        {counts.blocked}
      </span>
      <span className="ml-1 flex items-center gap-1 border-l border-edge pl-2">
        <MonitorIcon size={10} />
        {desktop}
      </span>
      <span className="flex items-center gap-1">
        <TerminalWindowIcon size={10} />
        {headless}
      </span>
    </>
  );
}

const STATUS_DOT_COLORS = [
  "var(--color-idle)",
  "var(--color-working)",
  "var(--color-reviewing)",
  "var(--color-green)",
] as const;

function StatusCounts({ counts }: { counts: number[] }) {
  return (
    <>
      {counts.map((count, i) => (
        <span key={i} className="flex items-center gap-1">
          <ColorDot color={STATUS_DOT_COLORS[i]} />
          {count}
        </span>
      ))}
    </>
  );
}

function TasksByStatus({ tasks }: { tasks?: ReturnType<typeof useTasks>["data"] }) {
  return (
    <StatusCounts
      counts={[
        (tasks?.filter((t) => t.status === TaskStatus.BACKLOG).length ?? 0) +
          (tasks?.filter((t) => t.status === TaskStatus.TODO).length ?? 0),
        tasks?.filter((t) => t.status === TaskStatus.IN_PROGRESS).length ?? 0,
        tasks?.filter((t) => t.status === TaskStatus.IN_REVIEW).length ?? 0,
        tasks?.filter((t) => t.status === TaskStatus.DONE).length ?? 0,
      ]}
    />
  );
}

function ProjectsByStatus({ projects }: { projects?: ReturnType<typeof useProjects>["data"] }) {
  return (
    <StatusCounts
      counts={[
        projects?.filter((p) => p.status === TaskStatus.BACKLOG || p.status === TaskStatus.TODO)
          .length ?? 0,
        projects?.filter((p) => p.status === TaskStatus.IN_PROGRESS).length ?? 0,
        projects?.filter((p) => p.status === TaskStatus.IN_REVIEW).length ?? 0,
        projects?.filter((p) => p.status === TaskStatus.DONE).length ?? 0,
      ]}
    />
  );
}
