'use client';

import { useState } from 'react';
import { Button, Input, Textarea, PanelSection, FilterChipGroup, CheckboxGroup } from '@monokeros/ui';
import { useTeams, useMembers } from '@/hooks/use-queries';
import { formatLabel } from '@monokeros/utils';
import type { Project, CreateProjectInput } from '@monokeros/types';
import { DEFAULT_ENTITY_COLOR, PRESET_COLORS } from '@monokeros/constants';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const KNOWN_TYPES = ['web', 'mobile', 'saas', 'api', 'desktop'];

interface Props {
  initial?: Project;
  onSubmit: (data: Partial<CreateProjectInput>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProjectForm({ initial, onSubmit, onCancel, isSubmitting }: Props) {
  const { data: teams } = useTeams();
  const { data: members } = useMembers();

  const agents = members?.filter((m) => m.type === 'agent');
  const humans = members?.filter((m) => m.type === 'human');

  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? DEFAULT_ENTITY_COLOR);
  const [types, setTypes] = useState<string[]>(initial?.types ?? []);
  const [teamIds, setTeamIds] = useState<string[]>(initial?.assignedTeamIds ?? []);
  const [memberIds, setMemberIds] = useState<string[]>(initial?.assignedMemberIds ?? []);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, slug, description, color, types, assignedTeamIds: teamIds, assignedMemberIds: memberIds });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        required
      />

      <Input
        label="Slug"
        value={slug}
        onChange={(e) => handleSlugChange(e.target.value)}
        required
        placeholder="auto-generated-from-name"
        className="font-mono"
      />

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      {/* Color */}
      <div>
        <label className="text-xs font-medium text-fg-2">Color</label>
        <div className="mt-1 flex gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-sm border-2 ${color === c ? 'border-fg' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Types */}
      <div>
        <label className="text-xs font-medium text-fg-2">Types</label>
        <FilterChipGroup
          items={KNOWN_TYPES}
          selected={types}
          onChange={setTypes}
          getId={(t) => t}
          getLabel={(t) => formatLabel(t)}
          getColor={() => 'var(--color-fg-3)'}
          className="mt-1"
        />
      </div>

      {/* Teams */}
      <div>
        <label className="text-xs font-medium text-fg-2">Teams</label>
        <FilterChipGroup
          items={teams ?? []}
          selected={teamIds}
          onChange={setTeamIds}
          getId={(t) => t.id}
          getLabel={(t) => t.name}
          getColor={(t) => t.color}
          className="mt-1"
        />
      </div>

      {/* Agents */}
      <div>
        <label className="text-xs font-medium text-fg-2">Agents</label>
        <CheckboxGroup
          items={agents ?? []}
          selected={memberIds}
          onChange={setMemberIds}
          getId={(a) => a.id}
          getLabel={(a) => a.name}
          className="mt-1 max-h-32 overflow-y-auto"
        />
      </div>

      {/* Humans */}
      <div>
        <label className="text-xs font-medium text-fg-2">Humans</label>
        <CheckboxGroup
          items={humans ?? []}
          selected={memberIds}
          onChange={setMemberIds}
          getId={(h) => h.id}
          getLabel={(h) => h.name}
          className="mt-1"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name || !slug || types.length === 0}
        >
          {initial ? 'Save' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
