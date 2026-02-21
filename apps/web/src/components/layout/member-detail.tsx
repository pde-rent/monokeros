import { TreeStructureIcon, ListChecksIcon, BriefcaseIcon, ChatCircleIcon, FolderIcon, CrownIcon } from '@phosphor-icons/react';
import { useTasks } from '@/hooks/use-queries';
import { useAgencyNavigation } from '@/hooks/use-agency-navigation';
import { StatusIndicator, Badge, Avatar, PanelSection } from '@monokeros/ui';
import { TASK_STATUS_LABELS, getTeamColor } from '@monokeros/constants';
import type { Member, Team } from '@monokeros/types';
import { NavAction } from './nav-action';

export function MemberDetail({ member, team }: { member: Member; team?: Team }) {
  const { data: tasks } = useTasks();
  const { goToAgentOrg, goToAgentTasks, goToAgentProjects, goToAgentChat, goToAgentFiles } = useAgencyNavigation();

  const currentTask = tasks?.find((t) => t.id === member.currentTaskId);
  const memberTasks = tasks?.filter((t) => t.assigneeIds.includes(member.id)) ?? [];
  const backlog = memberTasks
    .filter((t) => t.status !== 'done' && t.id !== member.currentTaskId)
    .slice(0, 3);

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
        </div>
      </PanelSection>

      {/* Team */}
      {team && (
        <PanelSection title="Team">
          <div className="text-[10px]" style={{ color: team.color }}>{team.name}</div>
        </PanelSection>
      )}

      {/* Current task */}
      {currentTask && (
        <PanelSection title="Current Task">
          <div className="text-[10px] font-medium text-fg">{currentTask.title}</div>
          <div className="text-[9px] text-fg-2">{TASK_STATUS_LABELS[currentTask.status]}</div>
        </PanelSection>
      )}

      {/* Queued tasks */}
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

      {/* Identity / Soul */}
      {member.identity && (
        <PanelSection title="Identity">
          <p className="text-[9px] text-fg leading-relaxed italic">
            &ldquo;{member.identity.soul}&rdquo;
          </p>
        </PanelSection>
      )}

      {/* Skills */}
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

      {/* Memory */}
      {member.identity && member.identity.memory.length > 0 && (
        <PanelSection title="Memory">
          <ul className="space-y-0.5">
            {member.identity.memory.map((mem, i) => (
              <li key={i} className="text-[8px] text-fg-2">&bull; {mem}</li>
            ))}
          </ul>
        </PanelSection>
      )}

      {/* Stats */}
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
      </PanelSection>

      {/* Navigation actions */}
      <div className="grid grid-cols-5 border-b border-edge">
        <NavAction icon={<TreeStructureIcon size={14} />} label="Org" onClick={() => goToAgentOrg(member.name)} />
        <NavAction icon={<ListChecksIcon size={14} />} label="Tasks" onClick={() => goToAgentTasks(member.name)} />
        <NavAction icon={<BriefcaseIcon size={14} />} label="Projects" onClick={() => goToAgentProjects(member.name)} />
        <NavAction icon={<ChatCircleIcon size={14} />} label="Chat" onClick={() => goToAgentChat(member.id)} />
        <NavAction icon={<FolderIcon size={14} />} label="Files" onClick={() => goToAgentFiles(member.id)} />
      </div>
    </>
  );
}
