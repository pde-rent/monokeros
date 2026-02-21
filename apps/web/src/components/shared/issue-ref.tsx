'use client';

import { useTasks } from '@/hooks/use-queries';
import { useAgencyNavigation } from '@/hooks/use-agency-navigation';
import { PRIORITY_COLORS } from '@monokeros/constants';
import { EntityLink, ColorDot } from '@monokeros/ui';

interface Props {
  issueId: string;
}

export function IssueRef({ issueId }: Props) {
  const { data: tasks } = useTasks();
  const { goToIssueDetail } = useAgencyNavigation();

  const task = tasks?.find((t) => t.id === issueId);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (task) {
      goToIssueDetail(task.projectId, task.id);
    }
  }

  return (
    <EntityLink
      label={issueId}
      onClick={handleClick}
      secondaryInfo={task?.title}
      variant="accent-green"
      prefix="#"
      showAvatar={false}
      title={task ? task.title : issueId}
      leading={
        <ColorDot
          color={task ? PRIORITY_COLORS[task.priority] : 'var(--color-fg-3)'}
          size="xs"
        />
      }
    />
  );
}
