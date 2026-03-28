"use client";

import { useState } from "react";
import {
  BuildingsIcon,
  KanbanIcon,
  ChatCircleIcon,
  FileTextIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { useProjects, useTasks, useTeams, useMembers } from "@/hooks/use-queries";
import { useAgencyNavigation } from "@/hooks/use-agency-navigation";
import { ColorDot, StatusBadge, Avatar, Badge, PanelSection } from "@monokeros/ui";
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, getTeamColor } from "@monokeros/constants";
import { formatLabel } from "@monokeros/utils";
import { TaskStatus } from "@monokeros/types";
import { NavAction } from "./nav-action";
import { ProjectDialog } from "@/components/projects/project-dialog";

interface Props {
  projectId: string;
}

export function ProjectDetail({ projectId }: Props) {
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks({ projectId });
  const { data: teams } = useTeams();
  const { data: members } = useMembers();
  const nav = useAgencyNavigation();

  const [showEdit, setShowEdit] = useState(false);

  const project = projects?.find((p) => p.id === projectId);
  if (!project) return null;

  const projectTeams = teams?.filter((t) => project.assignedTeamIds.includes(t.id)) ?? [];
  const projectAgents =
    members?.filter((m) => m.type === "agent" && project.assignedMemberIds.includes(m.id)) ?? [];
  const projectHumans =
    members?.filter((m) => m.type === "human" && project.assignedMemberIds.includes(m.id)) ?? [];

  // Task stats
  const statusCounts: Record<string, number> = {};
  for (const status of Object.values(TaskStatus)) {
    statusCounts[status] = tasks?.filter((t) => t.status === status).length ?? 0;
  }

  return (
    <>
      {/* Header */}
      <PanelSection>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: project.color }}
            />
            <span className="text-xs font-semibold text-fg">{project.name}</span>
          </div>
          <button onClick={() => setShowEdit(true)} className="p-0.5 text-fg-2 hover:text-fg">
            <PencilSimpleIcon size={12} />
          </button>
        </div>
        {project.description && (
          <p className="mt-1 text-[9px] text-fg-2 leading-relaxed line-clamp-3">
            {project.description}
          </p>
        )}
      </PanelSection>

      {/* Status */}
      <PanelSection title="Status">
        <StatusBadge
          label={TASK_STATUS_LABELS[project.status as TaskStatus] ?? project.status}
          color={TASK_STATUS_COLORS[project.status as TaskStatus] ?? "var(--color-idle)"}
        />
      </PanelSection>

      {/* Phase */}
      <PanelSection title="Phase">
        <div className="text-[10px] text-fg">{formatLabel(project.currentPhase)}</div>
      </PanelSection>

      {/* Types */}
      <PanelSection title="Types">
        <div className="flex flex-wrap gap-0.5">
          {project.types.map((type) => (
            <StatusBadge key={type} label={formatLabel(type)} color="var(--color-fg-3)" />
          ))}
        </div>
      </PanelSection>

      {/* Teams */}
      {projectTeams.length > 0 && (
        <PanelSection title={`Teams (${projectTeams.length})`}>
          <div className="space-y-0.5">
            {projectTeams.map((team) => (
              <div key={team.id} className="flex items-center gap-1.5">
                <ColorDot color={team.color} />
                <span className="text-[10px] text-fg">{team.name}</span>
              </div>
            ))}
          </div>
        </PanelSection>
      )}

      {/* Agents */}
      {projectAgents.length > 0 && (
        <PanelSection title={`Agents (${projectAgents.length})`}>
          <div className="flex flex-wrap gap-1">
            {projectAgents.slice(0, 5).map((member) => {
              const team = teams?.find((t) => t.id === member.teamId);
              return (
                <Avatar
                  key={member.id}
                  name={member.name}
                  src={member.avatarUrl}
                  color={getTeamColor(team)}
                  size="sm"
                />
              );
            })}
            {projectAgents.length > 5 && (
              <Badge className="text-[8px] px-1">+{projectAgents.length - 5}</Badge>
            )}
          </div>
        </PanelSection>
      )}

      {/* Humans */}
      {projectHumans.length > 0 && (
        <PanelSection title={`Humans (${projectHumans.length})`}>
          <div className="space-y-0.5">
            {projectHumans.map((human) => (
              <div key={human.id} className="text-[10px] text-fg">
                {human.name}
              </div>
            ))}
          </div>
        </PanelSection>
      )}

      {/* Gates (compact) */}
      {project.gates.length > 0 && (
        <PanelSection title="Gates">
          <div className="space-y-0.5">
            {project.gates.map((gate) => (
              <div key={gate.id} className="flex items-center justify-between text-[9px]">
                <span className="text-fg-2">{formatLabel(gate.phase)}</span>
                <span
                  className={`capitalize ${
                    gate.status === "approved"
                      ? "text-green"
                      : gate.status === "rejected"
                        ? "text-red"
                        : gate.status === "awaiting_approval"
                          ? "text-orange"
                          : "text-fg-3"
                  }`}
                >
                  {gate.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </PanelSection>
      )}

      {/* Task stats */}
      <PanelSection title="Tasks">
        <div className="grid grid-cols-3 gap-1 text-center">
          {Object.entries(statusCounts)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <div key={status}>
                <div className="text-sm font-semibold text-fg">{count}</div>
                <div className="text-[8px] text-fg-2 capitalize">
                  {TASK_STATUS_LABELS[status as TaskStatus]}
                </div>
              </div>
            ))}
        </div>
      </PanelSection>

      {/* Navigation actions */}
      <div className="grid grid-cols-4 border-b border-edge">
        <NavAction
          icon={<BuildingsIcon size={14} />}
          label="Org"
          onClick={() => nav.goToProjectDiagram(project.id)}
        />
        <NavAction
          icon={<KanbanIcon size={14} />}
          label="Tasks"
          onClick={() => nav.goToProjectDetail(project.id)}
        />
        {project.conversationId && (
          <NavAction
            icon={<ChatCircleIcon size={14} />}
            label="Chat"
            onClick={() => nav.goToProjectChat(project.id)}
          />
        )}
        <NavAction
          icon={<FileTextIcon size={14} />}
          label="Files"
          onClick={() => nav.goToProjectFiles(project.id)}
        />
      </div>

      {showEdit && (
        <ProjectDialog project={project} open={showEdit} onClose={() => setShowEdit(false)} />
      )}
    </>
  );
}
