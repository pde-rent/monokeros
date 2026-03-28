"use client";

import { useState } from "react";
import { Button, Input, Textarea, DropdownSelect, CheckboxGroup } from "@monokeros/ui";
import { useTeams, useMembers, useProjects } from "@/hooks/use-queries";
import { FilterChip } from "@/components/shared/filter-chip";
import { TaskPriority } from "@monokeros/types";
import type { CreateTaskInput } from "@monokeros/types";
import { formatLabel } from "@monokeros/utils";

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: TaskPriority.CRITICAL, label: "Critical", color: "var(--color-red)" },
  { value: TaskPriority.HIGH, label: "High", color: "var(--color-orange)" },
  { value: TaskPriority.MEDIUM, label: "Medium", color: "var(--color-yellow)" },
  { value: TaskPriority.LOW, label: "Low", color: "var(--color-blue)" },
  { value: TaskPriority.NONE, label: "None", color: "var(--color-fg-3)" },
];

interface Props {
  projectId: string;
  onSubmit: (data: CreateTaskInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CreateTaskForm({ projectId, onSubmit, onCancel, isSubmitting }: Props) {
  const { data: teams } = useTeams();
  const { data: members } = useMembers();
  const { data: projects } = useProjects();
  const agents = members?.filter((m) => m.type === "agent") ?? [];
  const project = projects?.find((p) => p.id === projectId);
  const phaseOptions = (project?.phases ?? []).map((p) => ({ value: p, label: formatLabel(p) }));

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [teamId, setTeamId] = useState("");
  const [phase, setPhase] = useState("development");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [offloadable, setOffloadable] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      description,
      type: null,
      projectId,
      priority,
      teamId,
      phase,
      assigneeIds,
      dependencies: [],
      offloadable,
      requiresHumanAcceptance: false,
      acceptanceCriteria: [],
      inputs: [],
    });
  }

  const teamOptions = (teams ?? []).map((t) => ({ value: t.id, label: t.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      {/* Priority */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-fg-3">
          Priority
        </label>
        <div className="mt-1 flex flex-wrap gap-1">
          {PRIORITY_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              color={opt.color}
              isActive={priority === opt.value}
              onClick={() => setPriority(opt.value)}
            />
          ))}
        </div>
      </div>

      <DropdownSelect
        label="Team"
        value={teamId}
        onChange={setTeamId}
        options={teamOptions}
        placeholder="Select a team"
      />

      <DropdownSelect label="Phase" value={phase} onChange={setPhase} options={phaseOptions} />

      {/* Assignees */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-fg-3">
          Assignees
        </label>
        <CheckboxGroup
          items={agents}
          selected={assigneeIds}
          onChange={setAssigneeIds}
          getId={(a) => a.id}
          getLabel={(a) => a.name}
          className="mt-1 max-h-32 overflow-y-auto"
        />
      </div>

      {/* Offloadable */}
      <label className="flex items-center gap-1.5 text-xs text-fg cursor-pointer">
        <input
          type="checkbox"
          checked={offloadable}
          onChange={(e) => setOffloadable(e.target.checked)}
          className="accent-blue"
        />
        Offloadable
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !title || !teamId}>
          Create
        </Button>
      </div>
    </form>
  );
}
