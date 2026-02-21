'use client';

import type { Task } from '@monokeros/types';
import { IntersectIcon } from '@phosphor-icons/react';
import { Window, ColorDot, StatusBadge, Badge } from '@monokeros/ui';
import { useMembers, useTeams, useTasks } from '@/hooks/use-queries';
import { PRIORITY_COLORS, CONFIDENCE_COLORS, CONSENSUS_STATE_COLORS, CONSENSUS_STATE_LABELS, TASK_STATUS_LABELS } from '@monokeros/constants';
import { formatLabel } from '@monokeros/utils';
import { MemberLink } from '@/components/shared/member-link';

interface Props {
  task: Task;
  onClose: () => void;
}

export function IssueDetailOverlay({ task, onClose }: Props) {
  const { data: members } = useMembers();
  const { data: teams } = useTeams();
  const { data: allTasks } = useTasks();
  const assignees = members?.filter((a) => task.assigneeIds.includes(a.id)) ?? [];
  const team = teams?.find((t) => t.id === task.teamId);
  const depTasks = allTasks?.filter((t) => task.dependencies.includes(t.id)) ?? [];

  const title = task.offloadable
    ? `${task.id} • Offloadable`
    : task.id;

  return (
    <Window
      id={`issue-${task.id}`}
      title={task.title}
      icon={<Badge>{task.id}</Badge>}
      open={true}
      onClose={onClose}
      width={640}
      height={480}
      minWidth={500}
      minHeight={400}
    >
      <div className="p-4 overflow-y-auto h-full">

        <div className="mt-4 grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-4">
            {/* Description */}
            <div>
              <div className="text-xs font-semibold uppercase text-fg-2">Description</div>
              <p className="mt-1 text-sm text-fg leading-relaxed">
                {task.description || 'No description provided.'}
              </p>
            </div>

            {/* Dependencies */}
            {depTasks.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-fg-2">Dependencies</div>
                <div className="mt-1 space-y-1">
                  {depTasks.map((dep) => (
                    <div key={dep.id} className="flex items-center gap-2 text-xs">
                      <ColorDot
                        color={dep.status === 'done' ? 'var(--color-green)' : 'var(--color-orange)'}
                        size="xs"
                      />
                      <span className="text-fg-2">{dep.id}</span>
                      <span className="text-fg">{dep.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cross-validation */}
            {task.crossValidation && (
              <div>
                <div className="text-xs font-semibold uppercase text-fg-2">
                  Cross-Validation
                </div>
                <div className="mt-2 rounded-md border border-edge bg-surface p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <IntersectIcon size={16} style={{ color: CONFIDENCE_COLORS[task.crossValidation.confidence] }} />
                      <span className="text-sm font-medium" style={{ color: CONFIDENCE_COLORS[task.crossValidation.confidence] }}>
                        {task.crossValidation.agreementScore}% Agreement ({task.crossValidation.confidence.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())})
                      </span>
                    </div>
                    <StatusBadge
                      label={CONSENSUS_STATE_LABELS[task.crossValidation.consensusState]}
                      color={CONSENSUS_STATE_COLORS[task.crossValidation.consensusState]}
                      className="px-2"
                    />
                  </div>

                  {task.crossValidation.memberResults.map((result) => {
                    const member = members?.find((a) => a.id === result.memberId);
                    return (
                      <div key={result.memberId} className="mt-3 border-t border-edge pt-3">
                        <div className="text-xs text-fg-2">
                          {member?.name ?? result.memberId}
                        </div>
                        <p className="mt-1 text-sm text-fg">{result.output}</p>
                      </div>
                    );
                  })}

                  {task.crossValidation.synthesis && (
                    <div className="mt-3 border-t border-edge pt-3">
                      <div className="text-xs font-semibold text-blue">Synthesis</div>
                      <p className="mt-1 text-sm text-fg">
                        {task.crossValidation.synthesis}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div>
              <div className="text-xs text-fg-2">Status</div>
              <div className="mt-1 inline-block rounded-sm bg-surface-3 px-2 py-1 text-xs capitalize text-fg">
                {TASK_STATUS_LABELS[task.status]}
              </div>
            </div>

            <div>
              <div className="text-xs text-fg-2">Priority</div>
              <div className="mt-1 flex items-center gap-1.5">
                <ColorDot color={PRIORITY_COLORS[task.priority]} size="md" />
                <span className="text-xs capitalize text-fg">{task.priority}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-fg-2">
                Assignees ({assignees.length})
              </div>
              <div className="mt-1 space-y-1">
                {assignees.length > 0 ? (
                  assignees.map((member) => (
                    <div key={member.id}>
                      <MemberLink member={member} size="md" />
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-fg-2">Unassigned</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-fg-2">Team</div>
              {team && (
                <div className="mt-1 text-xs" style={{ color: team.color }}>
                  {team.name}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-fg-2">Phase</div>
              <div className="mt-1 text-xs text-fg">
                {formatLabel(task.phase)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}
