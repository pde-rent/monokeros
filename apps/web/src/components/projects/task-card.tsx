'use client';

import React, { useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task, Member, Team } from '@monokeros/types';
import { PRIORITY_COLORS, CONFIDENCE_COLORS, CONSENSUS_STATE_COLORS } from '@monokeros/constants';
import { IntersectIcon } from '@phosphor-icons/react';
import { Card, ColorDot, StatusBadge } from '@monokeros/ui';
import { MemberLink } from '@/components/shared/member-link';

interface Props {
  task: Task;
  onClick?: () => void;
  onClickId?: (taskId: string) => void;
  isDragging?: boolean;
  members?: Member[];
  teams?: Team[];
}

export const TaskCard = React.memo(function TaskCard({ task, onClick, onClickId, isDragging = false, members, teams }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const handleClick = useCallback(() => {
    onClick?.();
    onClickId?.(task.id);
  }, [onClick, onClickId, task.id]);

  const assignees = members?.filter((a) => task.assigneeIds.includes(a.id)) ?? [];
  const team = teams?.find((t) => t.id === task.teamId);

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`bg-elevated p-3 rounded-sm ${
        isDragging ? 'rotate-2 shadow-xl opacity-90' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1">
          <ColorDot color={PRIORITY_COLORS[task.priority]} />
        </span>
        <span className="text-sm font-medium text-fg leading-tight">
          {task.title}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {assignees.slice(0, 3).map((member) => (
              <MemberLink key={member.id} member={member} size="sm" />
            ))}
            {assignees.length > 3 && (
              <span className="flex h-5 w-5 items-center justify-center bg-edge text-[9px] text-fg-2">
                +{assignees.length - 3}
              </span>
            )}
          </div>
          {team && (
            <StatusBadge label={team.name.split(' ')[0]} color={team.color} />
          )}
        </div>

        {task.crossValidation && (
          <div
            className="flex items-center gap-1"
            title={`${task.crossValidation.consensusState} - ${task.crossValidation.agreementScore}%`}
          >
            <ColorDot color={CONSENSUS_STATE_COLORS[task.crossValidation.consensusState]} />
            <IntersectIcon size={14} className="opacity-80" style={{ color: CONFIDENCE_COLORS[task.crossValidation.confidence] }} />
          </div>
        )}
      </div>

      {(task.commentCount > 0 || task.dependencies.length > 0) && (
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-fg-2">
          {task.commentCount > 0 && <span>{task.commentCount} comment{task.commentCount !== 1 ? 's' : ''}</span>}
          {task.dependencies.length > 0 && (
            <span title={`Depends on: ${task.dependencies.join(', ')}`}>
              {task.dependencies.length} dep{task.dependencies.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </Card>
  );
});
