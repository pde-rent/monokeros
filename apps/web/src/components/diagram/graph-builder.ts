import type { Node, Edge } from '@xyflow/react';
import type { Member, Team, Project } from '@monokeros/types';
import { DiagramViewMode } from '@monokeros/types';

// Layout constants for team group containers
const GROUP_WIDTH = 260;
const GROUP_HEADER_H = 40;
const GROUP_PAD_X = 30;
const GROUP_PAD_BOTTOM = 30;
const LEAD_REL_Y = GROUP_HEADER_H + 15;
const AGENT_START_Y = LEAD_REL_Y + 140;
const AGENT_STEP_Y = 110;

export function buildNodesAndEdges(
  members: Member[],
  teams: Team[],
  projects: Project[],
  viewMode: DiagramViewMode,
  teamFilter: string[] = [],
  statusFilter: string[] = [],
): { initialNodes: Node[]; initialEdges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const agents = members.filter((m) => m.type === 'agent');
  const humans = members.filter((m) => m.type === 'human');
  const standaloneAgents = agents.filter((a) => a.teamId === null);

  const teamSpacing = 320;

  // Apply team filter
  const filteredTeams = teamFilter.length > 0
    ? teams.filter((t) => teamFilter.includes(t.type))
    : teams;

  // Standalone agents (no team) — positioned above team groups
  const standaloneBaseY = viewMode === DiagramViewMode.MANAGEMENT ? 90 : 0;
  const totalTeamWidth = filteredTeams.length * teamSpacing;
  standaloneAgents.forEach((agent, idx) => {
    const x = totalTeamWidth / 2 + 100 - (standaloneAgents.length * 200) / 2 + idx * 200;
    nodes.push({
      id: agent.id,
      type: 'agent',
      position: { x, y: standaloneBaseY },
      data: {
        ...agent,
        teamColor: 'var(--color-accent-purple)',
        teamName: 'System',
        isSystem: true,
      },
    });

    // Dashed edges to all team leads (cross-team awareness)
    const leads = agents.filter((a) => a.isLead && a.teamId !== null);
    for (const lead of leads) {
      edges.push({
        id: `e-system-${agent.id}-${lead.id}`,
        source: agent.id,
        target: lead.id,
        type: 'smoothstep',
        style: { stroke: 'var(--color-purple)', strokeWidth: 1, strokeDasharray: '4 4' },
      });
    }
  });

  // Build team groups and agent nodes
  filteredTeams.forEach((team, teamIdx) => {
    const teamColor = team.color;
    const x = teamIdx * teamSpacing + 100;
    const baseY = viewMode === DiagramViewMode.MANAGEMENT ? 200 : 100;

    // Find lead and agents (apply status filter)
    const teamAgents = agents.filter((a) => a.teamId === team.id);
    const lead = teamAgents.find((a) => a.isLead);
    const teamMembers = teamAgents.filter((a) => !a.isLead && (statusFilter.length === 0 || statusFilter.includes(a.status)));
    const showLead = lead && (statusFilter.length === 0 || statusFilter.includes(lead.status));

    // Calculate group height based on children
    let groupHeight: number;
    if (showLead && lead && teamMembers.length > 0) {
      groupHeight = AGENT_START_Y + teamMembers.length * AGENT_STEP_Y + GROUP_PAD_BOTTOM;
    } else if (showLead && lead) {
      groupHeight = LEAD_REL_Y + 160 + GROUP_PAD_BOTTOM;
    } else {
      groupHeight = GROUP_HEADER_H + GROUP_PAD_BOTTOM;
    }

    // Team group container node
    nodes.push({
      id: team.id,
      type: 'teamGroup',
      position: { x, y: baseY },
      style: { width: GROUP_WIDTH, height: groupHeight },
      data: {
        label: team.name,
        teamColor,
        agentCount: team.memberIds.length,
        teamType: team.type,
      },
    });

    if (showLead && lead) {
      const leadRelX = (GROUP_WIDTH - 180) / 2; // center lead (180px wide)

      nodes.push({
        id: lead.id,
        type: 'leadAgent',
        parentId: team.id,
        extent: 'parent',
        position: { x: leadRelX, y: LEAD_REL_Y },
        data: {
          ...lead,
          teamColor,
          teamName: team.name,
        },
      });

      // Agent nodes as children of team group
      const agentRelX = (GROUP_WIDTH - 160) / 2; // center agents (160px wide)
      teamMembers.forEach((agent, agentIdx) => {
        nodes.push({
          id: agent.id,
          type: 'agent',
          parentId: team.id,
          extent: 'parent',
          position: { x: agentRelX, y: AGENT_START_Y + agentIdx * AGENT_STEP_Y },
          data: {
            ...agent,
            teamColor,
            teamName: team.name,
          },
        });

        if (viewMode !== DiagramViewMode.PROJECT) {
          edges.push({
            id: `e-${lead.id}-${agent.id}`,
            source: lead.id,
            target: agent.id,
            type: 'smoothstep',
            style: { stroke: 'var(--color-edge)', strokeWidth: 1.5 },
            animated: agent.status === 'working',
          });
        }
      });
    }
  });

  // Cross-team edges (lead to lead) - only among visible teams
  if (viewMode === DiagramViewMode.WORKFORCE || viewMode === DiagramViewMode.MANAGEMENT) {
    const filteredTeamIds = new Set(filteredTeams.map((t) => t.id));
    const leads = agents.filter((a) => a.isLead && filteredTeamIds.has(a.teamId!));
    for (let i = 0; i < leads.length; i++) {
      for (let j = i + 1; j < leads.length; j++) {
        if (leads[i].currentProjectId && leads[i].currentProjectId === leads[j].currentProjectId) {
          edges.push({
            id: `e-cross-${leads[i].id}-${leads[j].id}`,
            source: leads[i].id,
            target: leads[j].id,
            type: 'smoothstep',
            style: { stroke: 'var(--color-blue)', strokeWidth: 1, strokeDasharray: '5 5' },
          });
        }
      }
    }
  }

  // Management view: human nodes + supervision edges (only for visible teams)
  if (viewMode === DiagramViewMode.MANAGEMENT) {
    const filteredTeamIds = new Set(filteredTeams.map((t) => t.id));
    const visibleHumans = humans.filter((h) =>
      h.supervisedTeamIds.some((tid) => filteredTeamIds.has(tid))
    );
    visibleHumans.forEach((human, idx) => {
      const x = 100 + idx * 400;
      nodes.push({
        id: human.id,
        type: 'human',
        position: { x, y: 20 },
        data: {
          ...human,
          supervisedCount: human.supervisedTeamIds.length,
        },
      });

      // Supervision edges (only to visible teams)
      human.supervisedTeamIds.forEach((teamId) => {
        if (!filteredTeamIds.has(teamId)) return;
        const team = filteredTeams.find((t) => t.id === teamId);
        if (team) {
          edges.push({
            id: `e-supervise-${human.id}-${team.leadId}`,
            source: human.id,
            target: team.leadId,
            type: 'smoothstep',
            style: { stroke: 'var(--color-purple)', strokeWidth: 2 },
          });
        }
      });
    });
  }

  // Project view: annotate agent nodes with project badges instead of self-referencing edges
  if (viewMode === DiagramViewMode.PROJECT) {
    const memberProjects = new Map<string, { name: string; color: string }[]>();
    projects.forEach((project) => {
      project.assignedMemberIds.forEach((memberId) => {
        if (!memberProjects.has(memberId)) memberProjects.set(memberId, []);
        memberProjects.get(memberId)!.push({ name: project.name, color: project.color });
      });
    });
    // Merge project info into existing agent/lead nodes
    for (const node of nodes) {
      if ((node.type === 'agent' || node.type === 'leadAgent') && memberProjects.has(node.id)) {
        node.data = { ...node.data, projects: memberProjects.get(node.id) };
      }
    }
  }

  return { initialNodes: nodes, initialEdges: edges };
}
