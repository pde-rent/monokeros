"use client";

import type { Task } from "@monokeros/types";
import { useMembers, useTeams } from "@/hooks/use-queries";
import { StatusIndicator, ColorDot, Avatar, Badge, Card, CardItem } from "@monokeros/ui";
import { PRIORITY_COLORS, TASK_STATUS_LABELS, getTeamColor } from "@monokeros/constants";

function QueueTaskItem({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <CardItem onClick={onClick} className="p-2">
      <div className="flex items-start gap-1.5">
        <span className="mt-1">
          <ColorDot color={PRIORITY_COLORS[task.priority]} />
        </span>
        <span className="text-xs text-fg leading-tight">{task.title}</span>
      </div>
      <div className="mt-1 text-[10px] text-fg-2">{TASK_STATUS_LABELS[task.status]}</div>
    </CardItem>
  );
}

interface Props {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function AgentQueueView({ tasks, onTaskClick }: Props) {
  const { data: members } = useMembers();
  const { data: teams } = useTeams();

  const activeAgents =
    members?.filter((a) => {
      return a.type === "agent" && tasks.some((t) => t.assigneeIds.includes(a.id));
    }) ?? [];

  const unassigned = tasks.filter((t) => t.assigneeIds.length === 0);

  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-4">
      {activeAgents.map((agent) => {
        const team = teams?.find((t) => t.id === agent.teamId);
        const agentTasks = tasks
          .filter((t) => t.assigneeIds.includes(agent.id))
          .sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
            return order[a.priority] - order[b.priority];
          });

        return (
          <Card key={agent.id} className="flex w-64 shrink-0 flex-col">
            <div className="flex items-center gap-2 border-b border-edge px-3 py-2.5">
              <Avatar
                name={agent.name}
                src={agent.avatarUrl}
                color={getTeamColor(team)}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-sm font-medium text-fg">{agent.name}</span>
                  <StatusIndicator status={agent.status} size="sm" />
                </div>
                <div className="text-[10px] text-fg-2">{agent.title}</div>
              </div>
              <Badge>{agentTasks.length}</Badge>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
              {agentTasks.map((task) => (
                <QueueTaskItem key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
              ))}
            </div>
          </Card>
        );
      })}

      {unassigned.length > 0 && (
        <Card className="flex w-64 shrink-0 flex-col border-dashed">
          <div className="flex items-center justify-between border-b border-edge px-3 py-2.5">
            <span className="text-sm font-medium text-fg-2">Unassigned</span>
            <Badge>{unassigned.length}</Badge>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {unassigned.map((task) => (
              <QueueTaskItem key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
