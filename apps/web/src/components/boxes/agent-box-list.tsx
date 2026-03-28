"use client";

import { useState, useMemo } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useContainerStats } from "@/hooks/use-queries";
import { Avatar, StatusIndicator, Badge } from "@monokeros/ui";
import { createTextFilter } from "@monokeros/utils";
import type { Member } from "@monokeros/types";

const filterAgents = createTextFilter<Member>("name", "title");

interface Props {
  agents: Member[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function AgentBoxList({ agents, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return filterAgents(agents, search);
  }, [agents, search]);

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="flex items-center gap-1.5 border-b border-edge px-3 py-2">
        <MagnifyingGlassIcon size={12} className="shrink-0 text-fg-3" />
        <input
          type="text"
          placeholder="Filter agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-xs text-fg placeholder:text-fg-3 outline-none"
        />
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((agent) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            selected={agent.id === selectedId}
            onClick={() => onSelect(agent.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-center text-[10px] text-fg-3">No agents found</div>
        )}
      </div>
    </div>
  );
}

function AgentRow({
  agent,
  selected,
  onClick,
}: {
  agent: Member;
  selected: boolean;
  onClick: () => void;
}) {
  const { data: stats } = useContainerStats(agent.id);
  const hasStats = stats && stats.updatedAt;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
        selected ? "bg-blue-light" : "hover:bg-surface-2"
      }`}
    >
      <Avatar name={agent.name} src={agent.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-xs font-medium text-fg">{agent.name}</span>
          <StatusIndicator status={agent.status} size="sm" />
          {(agent as any).runtime === "zeroclaw" && (
            <Badge className="text-[7px] px-0.5">HL</Badge>
          )}
          <span className="ml-auto flex items-center gap-1">
            {hasStats && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
            )}
            {(agent.stats.totalCostUsd ?? 0) > 0 && (
              <span className="shrink-0 rounded bg-surface-2 px-1 text-[8px] text-fg-3">
                ${agent.stats.totalCostUsd!.toFixed(2)}
              </span>
            )}
          </span>
        </div>
        {hasStats ? (
          <div className="text-[9px] text-fg-3">
            {stats.windows.length} window{stats.windows.length !== 1 ? "s" : ""} | CPU{" "}
            {stats.cpuPercent}% | {stats.memoryMb} MB
          </div>
        ) : (
          <div className="text-[9px] text-fg-3">{agent.title}</div>
        )}
      </div>
    </button>
  );
}
