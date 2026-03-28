"use client";

import React, { useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Task, TaskStatus, Member, Team } from "@monokeros/types";
import { Badge, SectionHeader } from "@monokeros/ui";
import { TaskCard } from "./task-card";

interface Props {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  members?: Member[];
  teams?: Team[];
}

export const KanbanColumn = React.memo(function KanbanColumn({
  status,
  label,
  tasks,
  onTaskClick,
  members,
  teams,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const handleClick = useCallback((taskId: string) => onTaskClick(taskId), [onTaskClick]);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col border-r bg-surface transition-colors ${
        isOver ? "border-r-blue" : "border-r-edge"
      }`}
    >
      <SectionHeader
        title={label}
        action={<Badge variant="subtle">{tasks.length}</Badge>}
        className="px-3 py-2"
      />

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClickId={handleClick}
            members={members}
            teams={teams}
          />
        ))}
      </div>
    </div>
  );
});
