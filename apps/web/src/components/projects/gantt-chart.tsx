'use client';

import { useMemo } from 'react';
import type { Task, Project } from '@monokeros/types';
import { PRIORITY_COLORS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@monokeros/constants';
import { EmptyState } from '@monokeros/ui';

interface Props {
  tasks: Task[];
  projects: Project[];
  onTaskClick: (taskId: string) => void;
}

export function GanttChart({ tasks, projects, onTaskClick }: Props) {
  const { grouped, timeRange, dayWidth, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return {
        grouped: [] as { project: Project | undefined; tasks: Task[] }[],
        timeRange: { start: now, end: now },
        dayWidth: 24,
        totalDays: 30,
      };
    }

    const dates = tasks.map((t) => new Date(t.createdAt).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Extend range: 7 days before and 30 days after
    const start = new Date(minDate);
    start.setDate(start.getDate() - 7);
    const end = new Date(maxDate);
    end.setDate(end.getDate() + 30);

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const dayWidth = 24;

    // Group tasks by project
    const projectMap = new Map<string, Task[]>();
    for (const task of tasks) {
      const key = task.projectId;
      if (!projectMap.has(key)) projectMap.set(key, []);
      projectMap.get(key)!.push(task);
    }

    const grouped = Array.from(projectMap.entries()).map(([projectId, projectTasks]) => ({
      project: projects.find((p) => p.id === projectId),
      tasks: projectTasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));

    return { grouped, timeRange: { start, end }, dayWidth, totalDays };
  }, [tasks, projects]);

  function getDayOffset(dateStr: string) {
    const date = new Date(dateStr);
    return Math.floor((date.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Generate month headers
  const months = useMemo(() => {
    const result: { label: string; offset: number; width: number }[] = [];
    const cursor = new Date(timeRange.start);
    cursor.setDate(1);
    if (cursor < timeRange.start) cursor.setMonth(cursor.getMonth() + 1);

    while (cursor <= timeRange.end) {
      const offset = Math.max(0, Math.floor((cursor.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)));
      const nextMonth = new Date(cursor);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endOffset = Math.min(totalDays, Math.floor((nextMonth.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)));
      result.push({
        label: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        offset,
        width: endOffset - offset,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }, [timeRange, totalDays]);

  if (tasks.length === 0) {
    return (
      <EmptyState>No tasks to display</EmptyState>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Timeline header */}
      <div className="sticky top-0 z-10 border-b border-edge bg-surface-2">
        <div className="flex" style={{ width: `${totalDays * dayWidth}px`, marginLeft: 240 }}>
          {months.map((m) => (
            <div
              key={m.label}
              className="border-r border-edge px-2 py-1.5 text-xs font-semibold text-fg-2"
              style={{ width: `${m.width * dayWidth}px`, minWidth: `${m.width * dayWidth}px` }}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div>
        {grouped.map(({ project, tasks: projectTasks }) => (
          <div key={project?.id ?? 'unknown'}>
            {/* Project header */}
            <div className="flex items-center gap-2 border-b border-edge bg-surface-3 px-3 py-1.5">
              {project && (
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <span className="text-xs font-semibold text-fg">
                {project?.name ?? 'Unknown Project'}
              </span>
              <span className="text-xs text-fg-3">
                {projectTasks.length} tasks
              </span>
            </div>

            {/* Task rows */}
            {projectTasks.map((task) => {
              const offset = getDayOffset(task.createdAt);
              const created = new Date(task.createdAt).getTime();
              const updated = new Date(task.updatedAt).getTime();
              const durationDays = Math.ceil((updated - created) / (1000 * 60 * 60 * 24));
              const barWidth = Math.max(3, durationDays || 3);
              return (
                <div
                  key={task.id}
                  className="row-hover group flex items-center"
                  style={{ height: 36 }}
                >
                  {/* Task label */}
                  <div
                    className="flex shrink-0 items-center gap-1.5 overflow-hidden px-3"
                    style={{ width: 240 }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0"
                      style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                    />
                    <button
                      onClick={() => onTaskClick(task.id)}
                      className="truncate text-xs text-fg hover:text-blue"
                    >
                      {task.title}
                    </button>
                  </div>

                  {/* Bar area */}
                  <div className="relative flex-1" style={{ height: '100%' }}>
                    <div
                      className="absolute top-1/2 h-4 -translate-y-1/2 cursor-pointer rounded-sm transition-opacity hover:opacity-80"
                      style={{
                        left: `${offset * dayWidth}px`,
                        width: `${barWidth * dayWidth}px`,
                        backgroundColor: TASK_STATUS_COLORS[task.status] ?? 'var(--color-idle)',
                      }}
                      onClick={() => onTaskClick(task.id)}
                      title={`${task.title} (${TASK_STATUS_LABELS[task.status]})`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
