"use client";

import {
  TreeStructureIcon,
  ListChecksIcon,
  BriefcaseIcon,
  ChatCircleIcon,
  FolderIcon,
  MonitorIcon,
  CrownIcon,
} from "@phosphor-icons/react";
import { useTasks } from "@/hooks/use-queries";
import { useAgencyNavigation } from "@/hooks/use-agency-navigation";
import { StatusIndicator, Badge, Avatar, PanelSection } from "@monokeros/ui";
import { TASK_STATUS_LABELS, getTeamColor } from "@monokeros/constants";
import type { Member, Team } from "@monokeros/types";
import { NavAction } from "./nav-action";
import { formatTokenCount } from "@/lib/format";

export function MemberDetail({ member, team }: { member: Member; team?: Team }) {
  const { data: tasks } = useTasks();
  const { goToAgentOrg, goToAgentTasks, goToAgentProjects, goToAgentChat, goToAgentFiles, goToAgentBox } =
    useAgencyNavigation();

  const isAgent = member.type === "agent";
  const hasDesktop = (member as any).desktop ?? ((member as any).runtime !== "zeroclaw");

  return (
    <>
      {/* Identity header */}
      <PanelSection className="pt-3">
        <div className="flex items-center gap-2">
          <Avatar name={member.name} src={member.avatarUrl} color={getTeamColor(team)} size="lg" />
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-fg">{member.name}</span>
              {member.isLead && <CrownIcon size={12} weight="fill" className="text-yellow" />}
            </div>
            <div className="text-[10px] text-fg-2">{member.title}</div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px]">
          <StatusIndicator status={member.status} size="sm" />
          <span className="capitalize text-fg">{member.status}</span>
          {isAgent && (
            <Badge className="ml-1 text-[8px] px-1">
              {hasDesktop ? "Desktop" : "Headless"}
            </Badge>
          )}
        </div>
      </PanelSection>

      <MemberInfo member={member} team={team} tasks={tasks} />

      {/* Navigation actions */}
      <div className="grid grid-cols-3 border-b border-edge mt-auto">
        <NavAction
          icon={<TreeStructureIcon size={14} />}
          label="Org"
          onClick={() => goToAgentOrg(member.name)}
        />
        <NavAction
          icon={<ListChecksIcon size={14} />}
          label="Tasks"
          onClick={() => goToAgentTasks(member.name)}
        />
        <NavAction
          icon={<BriefcaseIcon size={14} />}
          label="Projects"
          onClick={() => goToAgentProjects(member.name)}
        />
        <NavAction
          icon={<ChatCircleIcon size={14} />}
          label="Chat"
          onClick={() => goToAgentChat(member.id)}
        />
        <NavAction
          icon={<FolderIcon size={14} />}
          label="Files"
          onClick={() => goToAgentFiles(member.id)}
        />
        {isAgent && hasDesktop && (
          <NavAction
            icon={<MonitorIcon size={14} />}
            label="Box"
            onClick={() => goToAgentBox(member.id)}
          />
        )}
      </div>
    </>
  );
}

function MemberInfo({
  member,
  team,
  tasks,
}: {
  member: Member;
  team?: Team;
  tasks?: Array<{ id: string; title: string; status: string; assigneeIds: string[] }>;
}) {
  const currentTask = tasks?.find((t) => t.id === member.currentTaskId);
  const backlog = (
    tasks?.filter(
      (t) =>
        t.assigneeIds.includes(member.id) && t.status !== "done" && t.id !== member.currentTaskId,
    ) ?? []
  ).slice(0, 3);

  return (
    <>
      {team && (
        <PanelSection title="Team">
          <div className="text-[10px]" style={{ color: team.color }}>
            {team.name}
          </div>
        </PanelSection>
      )}

      {currentTask && (
        <PanelSection title="Current Task">
          <div className="text-[10px] font-medium text-fg">{currentTask.title}</div>
          <div className="text-[9px] text-fg-2">
            {TASK_STATUS_LABELS[currentTask.status as keyof typeof TASK_STATUS_LABELS]}
          </div>
        </PanelSection>
      )}

      {backlog.length > 0 && (
        <PanelSection title={`Queued (${backlog.length})`}>
          <div className="space-y-0.5">
            {backlog.map((task) => (
              <div key={task.id} className="truncate text-[9px] text-fg-2">
                {task.title}
              </div>
            ))}
          </div>
        </PanelSection>
      )}

      {member.identity && (
        <PanelSection title="Identity">
          <p className="text-[9px] text-fg leading-relaxed italic">
            &ldquo;{member.identity.soul}&rdquo;
          </p>
        </PanelSection>
      )}

      {member.identity && (
        <PanelSection title="Skills">
          <div className="flex flex-wrap gap-0.5">
            {member.identity.skills.map((skill) => (
              <Badge key={skill} className="text-[8px] px-1 text-fg">
                {skill}
              </Badge>
            ))}
          </div>
        </PanelSection>
      )}

      {member.identity && member.identity.memory.length > 0 && (
        <PanelSection title="Memory">
          <ul className="space-y-0.5">
            {member.identity.memory.map((mem, i) => (
              <li key={i} className="text-[8px] text-fg-2">
                &bull; {mem}
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      <PanelSection title="Stats">
        <div className="grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-sm font-semibold text-fg">{member.stats.tasksCompleted}</div>
            <div className="text-[8px] text-fg-2">Completed</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-fg">{member.stats.avgAgreementScore}%</div>
            <div className="text-[8px] text-fg-2">Avg Score</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-fg">{member.stats.activeProjects}</div>
            <div className="text-[8px] text-fg-2">Projects</div>
          </div>
        </div>
        {(member.stats.totalTokens ?? 0) > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-1 border-t border-edge pt-2 text-center">
            <div>
              <div className="text-sm font-semibold text-fg">
                {formatTokenCount(member.stats.totalTokens!)}
              </div>
              <div className="text-[8px] text-fg-2">Tokens</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-fg">
                ${(member.stats.totalCostUsd ?? 0).toFixed(2)}
              </div>
              <div className="text-[8px] text-fg-2">Est. Cost</div>
            </div>
          </div>
        )}
      </PanelSection>
    </>
  );
}
