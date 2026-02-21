'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Task, TaskStatus } from '@monokeros/types';
import { TASK_STATUS_COLUMNS } from '@monokeros/constants';
import { useMembers, useTeams, useMoveTask } from '@/hooks/use-queries';
import { KanbanColumn } from './kanban-column';
import { TaskCard } from './task-card';

interface Props {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

const noop = () => {};

export const KanbanBoard = React.memo(function KanbanBoard({ tasks, onTaskClick }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { data: members } = useMembers();
  const { data: teams } = useTeams();
  const moveTask = useMoveTask();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const tasksByStatus = useMemo(() => {
    const grouped: Partial<Record<TaskStatus, Task[]>> = {};
    for (const t of tasks) {
      (grouped[t.status] ??= []).push(t);
    }
    return grouped;
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const validStatuses = Object.values(TaskStatus) as string[];
    if (!validStatuses.includes(newStatus)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      moveTask.mutate({ id: taskId, status: newStatus as TaskStatus });
    }
  }, [tasks, moveTask]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        {TASK_STATUS_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            tasks={tasksByStatus[column.status] ?? []}
            onTaskClick={onTaskClick}
            members={members}
            teams={teams}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onClick={noop} isDragging members={members} teams={teams} />}
      </DragOverlay>
    </DndContext>
  );
});
