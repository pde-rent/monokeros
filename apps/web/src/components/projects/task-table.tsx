'use client';

import { useMemo } from 'react';
import type { Task } from '@monokeros/types';
import { PRIORITY_COLORS, PRIORITY_ORDER, TASK_STATUS_COLORS, TASK_STATUS_LABELS, getTeamColor } from '@monokeros/constants';
import { formatLabel } from '@monokeros/utils';
import { formatDate } from '@monokeros/utils';
import { SortHeader, TableHeader, StatusBadge, EmptyState, AvatarStack } from '@monokeros/ui';
import { useMembers, useTeams, useProjects } from '@/hooks/use-queries';
import { useSort } from '@/hooks/use-sort';

type SortKey = 'title' | 'status' | 'priority' | 'project' | 'updatedAt';

interface Props {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function TaskTable({ tasks, onTaskClick }: Props) {
  const { sortKey, sortDir, handleSort } = useSort<SortKey>('updatedAt', 'desc');
  const { data: members } = useMembers();
  const { data: teams } = useTeams();
  const { data: projects } = useProjects();

  const sorted = useMemo(() => {
    const items = [...tasks];
    const dir = sortDir === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return a.title.localeCompare(b.title) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'priority':
          return ((PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)) * dir;
        case 'project': {
          const aName = projects?.find((p) => p.id === a.projectId)?.name ?? '';
          const bName = projects?.find((p) => p.id === b.projectId)?.name ?? '';
          return aName.localeCompare(bName) * dir;
        }
        case 'updatedAt':
          return a.updatedAt.localeCompare(b.updatedAt) * dir;
        default:
          return 0;
      }
    });
    return items;
  }, [tasks, sortKey, sortDir, projects]);

  if (tasks.length === 0) {
    return (
      <EmptyState>No tasks to display</EmptyState>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-surface-2">
          <tr className="border-b border-edge">
            <SortHeader label="Title" column="title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Project" column="project" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Priority" column="priority" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <TableHeader>Assignees</TableHeader>
            <TableHeader>Team</TableHeader>
            <TableHeader>Phase</TableHeader>
            <SortHeader label="Updated" column="updatedAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => {
            const project = projects?.find((p) => p.id === task.projectId);
            const team = teams?.find((t) => t.id === task.teamId);
            const assignees = members?.filter((a) => task.assigneeIds.includes(a.id)) ?? [];

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className="row-hover cursor-pointer"
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0"
                      style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                    />
                    <span className="text-xs font-medium text-fg">
                      {task.title}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {project && (
                    <div className="flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-xs text-fg-2">{project.name}</span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={TASK_STATUS_LABELS[task.status]}
                    color={TASK_STATUS_COLORS[task.status] ?? 'var(--color-idle)'}
                  />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={task.priority}
                    color={PRIORITY_COLORS[task.priority]}
                  />
                </td>
                <td className="px-3 py-2">
                  <AvatarStack
                    members={assignees.map((a) => ({
                      id: a.id,
                      name: a.name,
                      color: getTeamColor(teams?.find((t) => t.id === a.teamId)),
                    }))}
                  />
                </td>
                <td className="px-3 py-2">
                  {team && (
                    <span className="text-xs" style={{ color: team.color }}>
                      {team.name.split(' ')[0]}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs text-fg-2">
                    {formatLabel(task.phase)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] text-fg-3">
                    {formatDate(task.updatedAt)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
