"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  DesktopIcon,
  ArrowSquareOutIcon,
  CircleNotchIcon,
  PlayIcon,
  CursorIcon,
  EyeIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";
import { useMemberRuntime, useContainerStats, useDesktopSession, useStartMember, useMembers, useTokenUsage } from "@/hooks/use-queries";
import { usePopoutPortal } from "@/components/common/popout-portal";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { Button } from "@monokeros/ui";
import { formatTokenCount } from "@/lib/format";
import type { Id } from "../../../convex/_generated/dataModel";

const VncViewer = dynamic(() => import("./vnc-viewer"), { ssr: false });

interface Props {
  agentId: string;
  /** Hide popout button when already in a popout */
  isPopout?: boolean;
}

export function BoxDesktopPanel({ agentId, isPopout }: Props) {
  const { data: members } = useMembers();
  const { data: rawRuntime } = useMemberRuntime(agentId);
  const { data: stats } = useContainerStats(agentId);
  const [interactive, setInteractive] = useState(false);
  const { data: session, isLoading: sessionLoading } = useDesktopSession(agentId, interactive);
  const startMember = useStartMember();
  const workspaceId = useWorkspaceId();
  const popout = usePopoutPortal({ width: 900, height: 720 });

  const { data: recentUsage } = useTokenUsage(agentId, 10);

  const runtime = rawRuntime as { status?: string; vncPort?: number } | undefined;
  const agent = members?.find((m) => m.id === agentId);
  const isHeadless = !((agent as any)?.desktop ?? ((agent as any)?.runtime !== "zeroclaw"));
  const isRunning = runtime?.status === "running";

  // Compute session token totals from recent usage events
  const sessionTokens = (recentUsage as Array<{ promptTokens: number; completionTokens: number }> | undefined)?.reduce(
    (acc, u) => ({ prompt: acc.prompt + u.promptTokens, completion: acc.completion + u.completionTokens }),
    { prompt: 0, completion: 0 },
  );

  function handleStart() {
    if (!workspaceId) return;
    startMember.mutate({ workspaceId, memberId: agentId as Id<"members"> });
  }

  // Headless agent — no desktop available
  if (isHeadless) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-fg-2">
        <TerminalWindowIcon size={48} weight="thin" />
        <p className="text-xs font-medium">{agent?.name ?? "Agent"} is a headless agent</p>
        <p className="text-[10px] text-fg-3">
          Headless agents don&apos;t have a desktop. Use chat to interact with this agent.
        </p>
      </div>
    );
  }

  // Not running — show start prompt
  if (!isRunning) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-fg-2">
        <DesktopIcon size={48} weight="thin" />
        <p className="text-xs">{agent?.name ?? "Agent"} is not running.</p>
        <Button size="sm" variant="primary" onClick={handleStart} disabled={startMember.isPending}>
          {startMember.isPending ? (
            <>
              <CircleNotchIcon size={12} className="animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <PlayIcon size={12} weight="fill" />
              Start Agent
            </>
          )}
        </Button>
      </div>
    );
  }

  // Loading session
  if (sessionLoading || !session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-fg-2">
        <CircleNotchIcon size={24} className="animate-spin" />
        <p className="text-[10px]">Connecting to desktop...</p>
      </div>
    );
  }

  // Desktop not available yet
  if (!session.wsUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-fg-2">
        <CircleNotchIcon size={24} className="animate-spin" />
        <p className="text-[10px]">Desktop starting up...</p>
        <p className="text-[9px]">The container may still be initializing.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-edge px-3 py-1.5">
        <div className="flex items-center gap-2">
          <DesktopIcon size={14} />
          <span className="text-xs font-medium text-fg">{agent?.name ?? "Agent"}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
          <span className="text-[9px] text-fg-3">{session.viewOnly ? "View Only" : "Interactive"}</span>
        </div>

        <div className="flex items-center gap-3 text-[9px] text-fg-3">
          {stats?.updatedAt && (
            <>
              <span>{stats.windows.length} window{stats.windows.length !== 1 ? "s" : ""}</span>
              <span>CPU {stats.cpuPercent}%</span>
              <span>{stats.memoryMb} MB</span>
            </>
          )}
          {sessionTokens && (sessionTokens.prompt + sessionTokens.completion) > 0 && (
            <span className="border-l border-edge pl-3">
              {formatTokenCount(sessionTokens.prompt + sessionTokens.completion)} tok
            </span>
          )}
          {agent && (agent.stats.totalCostUsd ?? 0) > 0 && (
            <span>${agent.stats.totalCostUsd!.toFixed(2)}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {session.isAdmin && (
            <Button
              variant={interactive ? "primary" : "ghost"}
              size="sm"
              onClick={() => setInteractive((v) => !v)}
              title={interactive ? "Release control" : "Take control"}
              className="text-[10px]"
            >
              {interactive ? (
                <>
                  <EyeIcon size={12} />
                  Release
                </>
              ) : (
                <>
                  <CursorIcon size={12} />
                  Take Control
                </>
              )}
            </Button>
          )}
          {!isPopout && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={() => popout.open(
                <div className="h-full w-full overflow-hidden bg-surface">
                  <BoxDesktopPanel agentId={agentId} isPopout />
                </div>,
              )}
              title="Pop out desktop"
              className="text-fg-3 hover:text-fg"
              icon={<ArrowSquareOutIcon size={14} />}
            />
          )}
        </div>
      </div>

      {/* Desktop viewer — RFB canvas auto-scales to fill container */}
      <div className="flex-1 overflow-hidden bg-black">
        <VncViewer wsUrl={session.wsUrl} viewOnly={session.viewOnly} />
      </div>
    </div>
  );
}
