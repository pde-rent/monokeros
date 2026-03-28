"use client";

import { useState } from "react";
import {
  KanbanIcon,
  ChatCircleIcon,
  FileTextIcon,
  BuildingsIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import {
  useTasks,
  useMembers,
  useTeams,
  useProjects,
  useSubmitAcceptance,
} from "@/hooks/use-queries";
import { useAgencyNavigation } from "@/hooks/use-agency-navigation";
import { ColorDot, StatusBadge, Badge, PanelSection } from "@monokeros/ui";
import { ThinkingThread } from "@/components/chat/thinking-thread";
import {
  PRIORITY_COLORS,
  TASK_STATUS_LABELS,
  CONFIDENCE_COLORS,
  CONSENSUS_STATE_COLORS,
  CONSENSUS_STATE_LABELS,
  HUMAN_ACCEPTANCE_STATUS_LABELS,
  HUMAN_ACCEPTANCE_STATUS_COLORS,
} from "@monokeros/constants";
import { TaskStatus, HumanAcceptanceStatus } from "@monokeros/types";
import { formatLabel, formatRelativeTime } from "@monokeros/utils";
import { MemberLink } from "@/components/shared/member-link";
import { NavAction } from "./nav-action";
import { useWorkspaceId } from "@/hooks/use-workspace";

interface Props {
  taskId: string;
}

export function TaskDetail({ taskId }: Props) {
  const { data: tasks } = useTasks();
  const { data: members } = useMembers();
  const { data: teams } = useTeams();
  const { data: projects } = useProjects();
  const wid = useWorkspaceId();
  const nav = useAgencyNavigation();
  const submitAcceptance = useSubmitAcceptance();

  const [feedback, setFeedback] = useState("");

  const task = tasks?.find((t) => t.id === taskId);
  if (!task) return null;

  const assignees = members?.filter((m) => task.assigneeIds.includes(m.id)) ?? [];
  const team = teams?.find((t) => t.id === task.teamId);
  const project = projects?.find((p) => p.id === task.projectId);
  const depTasks = tasks?.filter((t) => task.dependencies.includes(t.id)) ?? [];

  const isAwaitingAcceptance = task.status === TaskStatus.AWAITING_ACCEPTANCE;
  const hasResolvedAcceptance =
    task.humanAcceptance && task.humanAcceptance.status !== HumanAcceptanceStatus.PENDING;
  const reviewer = task.humanAcceptance?.reviewerId
    ? members?.find((m) => m.id === task.humanAcceptance!.reviewerId)
    : null;

  return (
    <>
      {/* Header */}
      <PanelSection>
        <div className="flex items-center gap-2 text-[10px] text-fg-2">
          <span>{task.id}</span>
          {task.offloadable && <Badge className="text-[8px] px-1">Offloadable</Badge>}
        </div>
        <div className="mt-0.5 text-xs font-semibold text-fg leading-tight">{task.title}</div>
      </PanelSection>

      {/* Status */}
      <PanelSection title="Status">
        <Badge className="capitalize text-fg">{TASK_STATUS_LABELS[task.status]}</Badge>
      </PanelSection>

      {/* Priority */}
      <PanelSection title="Priority">
        <div className="flex items-center gap-1.5">
          <ColorDot color={PRIORITY_COLORS[task.priority]} size="md" />
          <span className="text-[10px] capitalize text-fg">{task.priority}</span>
        </div>
      </PanelSection>

      {/* Assignees */}
      <PanelSection title={`Assignees (${assignees.length})`}>
        {assignees.length > 0 ? (
          <div className="space-y-0.5">
            {assignees.map((member) => (
              <div key={member.id}>
                <MemberLink member={member} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-fg-2">Unassigned</span>
        )}
      </PanelSection>

      {/* Team */}
      {team && (
        <PanelSection title="Team">
          <div className="text-[10px]" style={{ color: team.color }}>
            {team.name}
          </div>
        </PanelSection>
      )}

      {/* Phase */}
      <PanelSection title="Phase">
        <div className="text-[10px] text-fg">{formatLabel(task.phase)}</div>
      </PanelSection>

      {/* Description */}
      {task.description && (
        <PanelSection title="Description">
          <p className="text-[9px] text-fg leading-relaxed">{task.description}</p>
        </PanelSection>
      )}

      {/* Dependencies */}
      {depTasks.length > 0 && (
        <PanelSection title="Dependencies">
          <div className="space-y-0.5">
            {depTasks.map((dep) => (
              <div key={dep.id} className="flex items-center gap-1.5 text-[9px]">
                <ColorDot
                  color={dep.status === "done" ? "var(--color-green)" : "var(--color-orange)"}
                  size="xs"
                />
                <span className="text-fg-2">{dep.id}</span>
                <span className="truncate text-fg">{dep.title}</span>
              </div>
            ))}
          </div>
        </PanelSection>
      )}

      {/* Cross-validation */}
      {task.crossValidation && (
        <PanelSection title="Cross-Validation">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-medium"
              style={{ color: CONFIDENCE_COLORS[task.crossValidation.confidence] }}
            >
              {task.crossValidation.agreementScore}%
            </span>
            <StatusBadge
              label={CONSENSUS_STATE_LABELS[task.crossValidation.consensusState]}
              color={CONSENSUS_STATE_COLORS[task.crossValidation.consensusState]}
              className="px-1"
            />
          </div>
          {task.crossValidation.synthesis && (
            <p className="mt-1 text-[8px] text-fg-2 leading-relaxed">
              {task.crossValidation.synthesis}
            </p>
          )}
        </PanelSection>
      )}

      {/* Human Acceptance */}
      {task.requiresHumanAcceptance && (
        <PanelSection title="Human Acceptance">
          {isAwaitingAcceptance && (
            <div>
              <p className="text-[9px] text-fg-2 leading-relaxed">
                This task requires human acceptance before it can be marked as done.
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional feedback..."
                className="mt-1.5 w-full rounded border border-edge bg-surface-2 px-2 py-1 text-[10px] text-fg placeholder:text-fg-3 focus:border-blue focus:outline-none"
                rows={2}
              />
              <div className="mt-1.5 flex gap-1.5">
                <button
                  onClick={() =>
                    wid &&
                    submitAcceptance.mutate({
                      workspaceId: wid,
                      taskId: task.id as any,
                      action: "accept",
                      feedback: feedback || undefined,
                    })
                  }
                  disabled={submitAcceptance.isPending}
                  className="flex items-center gap-1 rounded bg-green px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-green/80 disabled:opacity-50"
                >
                  <CheckCircleIcon size={12} />
                  Accept
                </button>
                <button
                  onClick={() =>
                    wid &&
                    submitAcceptance.mutate({
                      workspaceId: wid,
                      taskId: task.id as any,
                      action: "reject",
                      feedback: feedback || undefined,
                    })
                  }
                  disabled={submitAcceptance.isPending}
                  className="flex items-center gap-1 rounded bg-red px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-red/80 disabled:opacity-50"
                >
                  <XCircleIcon size={12} />
                  Reject
                </button>
              </div>
            </div>
          )}

          {hasResolvedAcceptance && task.humanAcceptance && (
            <div>
              <StatusBadge
                label={HUMAN_ACCEPTANCE_STATUS_LABELS[task.humanAcceptance.status]}
                color={HUMAN_ACCEPTANCE_STATUS_COLORS[task.humanAcceptance.status]}
                className="px-1"
              />
              {reviewer && (
                <div className="mt-1 text-[9px] text-fg-2">Reviewed by {reviewer.name}</div>
              )}
              {task.humanAcceptance.feedback && (
                <p className="mt-1 text-[8px] text-fg-2 leading-relaxed">
                  {task.humanAcceptance.feedback}
                </p>
              )}
              {task.humanAcceptance.reviewedAt && (
                <div className="mt-0.5 text-[8px] text-fg-3">
                  {formatRelativeTime(task.humanAcceptance.reviewedAt)}
                </div>
              )}
            </div>
          )}

          {!isAwaitingAcceptance && !hasResolvedAcceptance && (
            <span className="text-[9px] text-fg-3">
              Acceptance will be required when moved from In Review.
            </span>
          )}
        </PanelSection>
      )}

      {/* Thinking thread */}
      {task.conversationId && (
        <PanelSection title="Thinking">
          <ThinkingThread conversationId={task.conversationId} />
        </PanelSection>
      )}

      {/* Navigation actions */}
      <div className="grid grid-cols-4 border-b border-edge">
        {project && (
          <NavAction
            icon={<KanbanIcon size={14} />}
            label="Project"
            onClick={() => nav.goToIssueDetail(project.id, task.id)}
          />
        )}
        {project?.conversationId && (
          <NavAction
            icon={<ChatCircleIcon size={14} />}
            label="Chat"
            onClick={() => nav.goToProjectChat(project.id)}
          />
        )}
        {project && (
          <NavAction
            icon={<FileTextIcon size={14} />}
            label="Files"
            onClick={() => nav.goToProjectFiles(project.id)}
          />
        )}
        <NavAction
          icon={<BuildingsIcon size={14} />}
          label="Org"
          onClick={() => {
            if (assignees[0]) nav.goToAgentOrg(assignees[0].name);
          }}
        />
      </div>
    </>
  );
}
