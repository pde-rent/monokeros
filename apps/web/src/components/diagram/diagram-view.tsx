'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useMembers, useTeams, useProjects } from '@/hooks/use-queries';
import { useDiagramStore } from '@/stores/diagram-store';
import { useUIStore } from '@/stores/ui-store';
import { DiagramViewMode } from '@monokeros/types';
import { FilterPanel } from './filter-panel';
import { AgentTable } from './agent-table';
import { TeamGroupNode } from './nodes/team-group-node';
import { LeadAgentNode } from './nodes/lead-agent-node';
import { AgentNode } from './nodes/agent-node';
import { HumanNode } from './nodes/human-node';
import { buildNodesAndEdges } from './graph-builder';
import { useRegisterFab, type FabAction } from '@/components/shared/fab-context';
import { CreateAgentDialog } from './create-agent-dialog';
import { UserPlusIcon } from '@phosphor-icons/react';
import { CollapsiblePanel, useCollapsiblePanel, PANEL_CONSTANTS } from '@/components/layout/collapsible-panel';
import { usePopoutPortal } from '@/components/common/popout-portal';

const nodeTypes: NodeTypes = {
  teamGroup: TeamGroupNode,
  leadAgent: LeadAgentNode,
  agent: AgentNode,
  human: HumanNode,
};

function ResizeHandle() {
  return (
    <Separator className="group relative flex items-center justify-center w-px bg-edge hover:bg-blue transition-colors">
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
    </Separator>
  );
}

interface DiagramViewProps {
  /** Hide the popout button (e.g. when already in a popout) */
  isPopout?: boolean;
}

export function DiagramView({ isPopout }: DiagramViewProps = {}) {
  const { data: members } = useMembers();
  const { data: teams } = useTeams();
  const { data: projects } = useProjects();
  const { viewMode, displayMode, filterPanelOpen, highlightedNodeId, teamFilter, statusFilter, search } = useDiagramStore();
  const { openDetailPanel } = useUIStore();
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const filterPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH);
  const diagramPopout = usePopoutPortal({ width: 1000, height: 700 });

  const fabConfig = useMemo(() => ({
    actions: [{
      id: 'new-agent',
      label: 'New Agent',
      icon: UserPlusIcon,
      onClick: () => setShowCreateAgent(true),
    }] as FabAction[],
    tooltip: 'New Agent',
  }), []);
  useRegisterFab(fabConfig);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!members || !teams || !projects) {
      return { initialNodes: [], initialEdges: [] };
    }
    return buildNodesAndEdges(members, teams, projects, viewMode, teamFilter, statusFilter);
  }, [members, teams, projects, viewMode, teamFilter, statusFilter]);

  // Default zoom: focus on the Product Management team
  const fitViewOptions = useMemo(() => {
    const productTeam = teams?.find((t) => t.type === 'product');
    if (!productTeam) return { padding: 0.3 };
    return {
      nodes: [{ id: productTeam.id }, ...productTeam.memberIds.map((id) => ({ id }))],
      padding: 0.3,
    };
  }, [teams]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'leadAgent' || node.type === 'agent') {
        openDetailPanel('agent', node.id);
      } else if (node.type === 'teamGroup') {
        openDetailPanel('team', node.id);
      } else if (node.type === 'human') {
        openDetailPanel('human', node.id);
      }
    },
    [openDetailPanel],
  );

  // Filter agent-type members for table view
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let result = members.filter((m) => m.type === 'agent');
    if (teamFilter.length > 0) {
      const teamIds = teams?.filter((t) => teamFilter.includes(t.type)).map((t) => t.id) ?? [];
      result = result.filter((a) => teamIds.includes(a.teamId!));
    }
    if (statusFilter.length > 0) {
      result = result.filter((a) => statusFilter.includes(a.status));
    }
    return result;
  }, [members, teams, teamFilter, statusFilter]);

  // Pre-compute highlight/fade state so React Flow can memoize nodes
  const highlightedNodes = useMemo(() => {
    const searchLower = search.toLowerCase();
    return nodes.map((n) => {
      const isAgentLike = n.type === 'agent' || n.type === 'leadAgent';
      const nameMatch = isAgentLike && searchLower
        ? (n.data.name as string)?.toLowerCase().includes(searchLower) ||
          (n.data.title as string)?.toLowerCase().includes(searchLower) ||
          (n.data.specialization as string)?.toLowerCase().includes(searchLower)
        : true;
      return {
        ...n,
        data: {
          ...n.data,
          highlighted: n.id === highlightedNodeId || (isAgentLike && !!searchLower && nameMatch),
          faded: isAgentLike && !!searchLower && !nameMatch,
        },
      };
    });
  }, [nodes, search, highlightedNodeId]);

  return (
    <Group orientation="horizontal" className="h-full">
      {filterPanelOpen && (
        <>
          <Panel
            id="filters"
            defaultSize={`${PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH}px`}
            minSize={`${PANEL_CONSTANTS.NOTCH_WIDTH}px`}
            maxSize={`${PANEL_CONSTANTS.MAX_EXPANDED_WIDTH}px`}
            className="overflow-hidden"
            panelRef={(ref) => { filterPanel.ref.current = ref; }}
          >
            <CollapsiblePanel
              title="Filters"
              side="left"
              collapsed={filterPanel.collapsed}
              onToggleCollapse={filterPanel.toggleCollapse}
            >
              <FilterPanel onPopout={isPopout ? undefined : () => diagramPopout.open()} />
            </CollapsiblePanel>
          </Panel>
          <ResizeHandle />
        </>
      )}
      <Panel id="content" minSize="400px" className="overflow-hidden">
        <CreateAgentDialog open={showCreateAgent} onClose={() => setShowCreateAgent(false)} />
        {displayMode === 'table' ? (
          <AgentTable members={filteredMembers} search={search} />
        ) : (
          <ReactFlow
            nodes={highlightedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            fitView
            fitViewOptions={fitViewOptions}
            proOptions={{ hideAttribution: true }}
            className="bg-canvas"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--raw-canvas-dots)" />
            <Controls position="top-right" />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'human') return 'var(--color-purple)';
                if (node.data?.teamColor) return node.data.teamColor as string;
                return 'var(--color-edge)';
              }}
              maskColor="var(--raw-minimap-mask)"
              pannable
              zoomable
              position="bottom-right"
            />
          </ReactFlow>
        )}
      </Panel>
      {diagramPopout.isOpen && diagramPopout.render(
        <div className="h-full w-full overflow-hidden bg-surface">
          <DiagramView isPopout />
        </div>
      )}
    </Group>
  );
}
