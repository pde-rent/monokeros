"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Panel, Group } from "react-resizable-panels";
import { useMembers } from "@/hooks/use-queries";
import { AgentBoxList } from "./agent-box-list";
import { BoxDesktopPanel } from "./box-desktop-panel";
import { EmptyState } from "@monokeros/ui";
import {
  CollapsibleSidePanel,
  useCollapsiblePanel,
} from "@/components/layout/collapsible-panel";
import { ResizeHandle } from "@/components/layout/resizable-layout";

export function BoxesView() {
  const { data: members } = useMembers();
  const searchParams = useSearchParams();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const agentsPanel = useCollapsiblePanel(240);

  const agents = members?.filter((m) => m.type === "agent" && ((m as any).desktop ?? ((m as any).runtime !== "zeroclaw"))) ?? [];

  // Auto-select from URL param or first agent
  useEffect(() => {
    const urlAgent = searchParams.get("agent");
    if (urlAgent && agents.some((a) => a.id === urlAgent)) {
      setSelectedAgentId(urlAgent);
      return;
    }
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, searchParams, selectedAgentId]);

  return (
    <Group orientation="horizontal" className="h-full">
      {/* Agent list */}
      <CollapsibleSidePanel id="agents" title="Agents" side="left" panel={agentsPanel} defaultWidth={240}>
        <AgentBoxList
          agents={agents}
          selectedId={selectedAgentId}
          onSelect={setSelectedAgentId}
        />
      </CollapsibleSidePanel>

      <ResizeHandle />

      {/* Desktop viewer */}
      <Panel id="desktop" minSize="400px" className="overflow-hidden">
        {selectedAgentId ? (
          <BoxDesktopPanel agentId={selectedAgentId} />
        ) : (
          <EmptyState>Select an agent to view its desktop</EmptyState>
        )}
      </Panel>
    </Group>
  );
}
