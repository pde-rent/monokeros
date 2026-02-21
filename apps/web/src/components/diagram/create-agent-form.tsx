'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Input, Textarea, DropdownSelect, CheckboxGroup } from '@monokeros/ui';
import { useTeams } from '@/hooks/use-queries';
import { useWorkspaceSlug } from '@/hooks/use-workspace-slug';
import { api } from '@/lib/api-client';
import { AiProvider } from '@monokeros/types';
import type { CreateMemberInput, AgentModelConfig, MemberGender } from '@monokeros/types';
import { ArrowsClockwiseIcon, UploadSimpleIcon, XIcon, UserIcon } from '@phosphor-icons/react';

const PROVIDER_OPTIONS = Object.values(AiProvider).map((p) => ({ value: p, label: p.replace(/_/g, ' ').toUpperCase() }));

const PERMISSION_OPTIONS = [
  { id: 'create_tasks', label: 'Create / modify tasks' },
  { id: 'validate_peers', label: 'Validate peer work' },
  { id: 'manage_phases', label: 'Manage project phases' },
  { id: 'access_all_files', label: 'Access all files' },
  { id: 'external_comms', label: 'External communication' },
];

const GENDER_OPTIONS = [
  { value: '1', label: 'Male' },
  { value: '2', label: 'Female' },
];

interface Props {
  onSubmit: (data: CreateMemberInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CreateAgentForm({ onSubmit, onCancel, isSubmitting }: Props) {
  const slug = useWorkspaceSlug();
  const { data: teams } = useTeams();

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [soul, setSoul] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [teamId, setTeamId] = useState('');
  const [gender, setGender] = useState<MemberGender | ''>('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [avatarSeed, setAvatarSeed] = useState<string>(crypto.randomUUID());
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [providerId, setProviderId] = useState('');
  const [modelName, setModelName] = useState('');
  const [apiKeyOverride, setApiKeyOverride] = useState('');
  const [temperature, setTemperature] = useState('');
  const [maxTokens, setMaxTokens] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch avatar preview
  const fetchAvatarPreview = useCallback(async (tid?: string, g?: MemberGender | '', seed?: string) => {
    if (!slug) return;
    try {
      const { avatarUrl } = await api.members.avatarPreview(slug, seed || avatarSeed, tid || undefined, g || undefined);
      setGeneratedAvatar(avatarUrl);
    } catch { /* ignore preview failures */ }
  }, [slug, avatarSeed]);

  // Fetch identity preview (name + gender)
  const fetchIdentityPreview = useCallback(async (g?: MemberGender) => {
    if (!slug) return;
    try {
      const identity = await api.members.identityPreview(slug, g || undefined);
      setName(identity.firstName);
      if (!gender) {
        // Only set gender if user hasn't explicitly selected one
        setGender(identity.gender);
      }
      return identity;
    } catch { /* ignore preview failures */ }
    return null;
  }, [slug, gender]);

  // Initialize with random name on mount
  useEffect(() => {
    if (slug && !name) {
      fetchIdentityPreview();
    }
  }, [slug, name, fetchIdentityPreview]);

  // Fetch avatar preview when team or gender changes
  useEffect(() => {
    if (!uploadedAvatar) {
      fetchAvatarPreview(teamId, gender);
    }
  }, [fetchAvatarPreview, teamId, gender, uploadedAvatar]);

  // Handle gender change - regenerate avatar with new gender
  const handleGenderChange = useCallback((newGender: MemberGender | '') => {
    setGender(newGender);
    // Avatar will be regenerated in the useEffect
  }, []);

  // Re-roll name only (keeps current gender and avatar seed)
  const handleRerollName = useCallback(async () => {
    if (!slug) return;
    try {
      const identity = await api.members.identityPreview(slug, gender || undefined);
      setName(identity.firstName);
      // Keep current avatar seed
    } catch { /* ignore */ }
  }, [slug, gender]);

  // Re-roll identity (name + gender + new avatar)
  const handleRerollIdentity = useCallback(async () => {
    if (!slug) return;
    try {
      const identity = await api.members.identityPreview(slug); // Don't pass gender - get random
      setName(identity.firstName);
      setGender(identity.gender);
      // Generate new avatar seed
      const newSeed = crypto.randomUUID();
      setAvatarSeed(newSeed);
      // Fetch new avatar with new seed and gender
      const { avatarUrl } = await api.members.avatarPreview(slug, newSeed, teamId || undefined, identity.gender);
      setGeneratedAvatar(avatarUrl);
    } catch { /* ignore */ }
  }, [slug, teamId]);

  function handleSkillKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = skillInput.trim();
      if (value && !skills.includes(value)) {
        setSkills([...skills, value]);
      }
      setSkillInput('');
    }
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedAvatar(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function buildModelConfig(): AgentModelConfig | null {
    if (!showModelConfig) return null;
    const config: AgentModelConfig = {};
    if (providerId) config.providerId = providerId as AiProvider;
    if (modelName) config.model = modelName;
    if (apiKeyOverride) config.apiKeyOverride = apiKeyOverride;
    if (temperature) config.temperature = parseFloat(temperature);
    if (maxTokens) config.maxTokens = parseInt(maxTokens, 10);
    return Object.keys(config).length > 0 ? config : null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      title,
      specialization,
      teamId,
      isLead: false,
      avatarUrl: uploadedAvatar,
      gender: gender || undefined,
      identity: { soul, skills, memory: [] },
      permissions,
      modelConfig: buildModelConfig(),
    });
  }

  const teamOptions = (teams ?? []).map((t) => ({ value: t.id, label: t.name }));
  const displayAvatar = uploadedAvatar ?? generatedAvatar;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name with re-roll buttons */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium uppercase tracking-wider text-fg-3">Name</label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRerollName}
              title="Re-roll name only"
            >
              <ArrowsClockwiseIcon size={12} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRerollIdentity}
              title="Re-roll name, gender & avatar"
            >
              <UserIcon size={12} />
            </Button>
          </div>
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      {/* Avatar */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-fg-3">Avatar</label>
        <div className="mt-1 flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-edge bg-surface-2">
            {displayAvatar ? (
              <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-fg-3 text-xs">...</div>
            )}
            {uploadedAvatar && (
              <button
                type="button"
                onClick={() => setUploadedAvatar(null)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-1 border border-edge text-fg-3 hover:text-red"
              >
                <XIcon size={10} weight="bold" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadSimpleIcon size={14} className="mr-1" />
              Upload
            </Button>
            {!uploadedAvatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newSeed = crypto.randomUUID();
                  setAvatarSeed(newSeed);
                  fetchAvatarPreview(teamId, gender, newSeed);
                }}
              >
                <ArrowsClockwiseIcon size={14} className="mr-1" />
                Re-roll
              </Button>
            )}
          </div>
        </div>
      </div>

      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Input label="Specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} required />
      <Textarea label="Soul" value={soul} onChange={(e) => setSoul(e.target.value)} rows={3} required />

      {/* Skills tag input */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-fg-3">Skills</label>
        <div className="mt-1 flex flex-wrap gap-1">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-sm bg-surface-3 px-2 py-0.5 text-xs text-fg"
            >
              {skill}
              <button type="button" onClick={() => removeSkill(skill)} className="text-fg-3 hover:text-red">
                &times;
              </button>
            </span>
          ))}
        </div>
        <input
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={handleSkillKeyDown}
          placeholder="Type a skill and press Enter"
          className="mt-1 w-full rounded-md border border-edge bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-3 focus:border-blue"
        />
      </div>

      <DropdownSelect
        label="Team"
        value={teamId}
        onChange={setTeamId}
        options={teamOptions}
        placeholder="Select a team"
      />

      <DropdownSelect
        label="Gender"
        value={String(gender)}
        onChange={(v) => handleGenderChange(v ? (Number(v) as MemberGender) : '')}
        options={GENDER_OPTIONS}
        placeholder="Random"
      />

      {/* Permissions */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-fg-3">Permissions</label>
        <CheckboxGroup
          items={PERMISSION_OPTIONS}
          selected={permissions}
          onChange={setPermissions}
          getId={(p) => p.id}
          getLabel={(p) => p.label}
          className="mt-1"
        />
      </div>

      {/* Model Configuration (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowModelConfig(!showModelConfig)}
          className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-fg-3 hover:text-fg-2"
        >
          <span className={`inline-block transition-transform ${showModelConfig ? 'rotate-90' : ''}`}>&#9654;</span>
          Model Configuration
        </button>
        {showModelConfig && (
          <div className="mt-2 space-y-3 rounded-md border border-edge bg-surface-2 p-3">
            <DropdownSelect
              label="Provider"
              value={providerId}
              onChange={setProviderId}
              options={PROVIDER_OPTIONS}
              placeholder="Workspace default"
            />
            <Input
              label="Model"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. glm-5, gpt-4o, claude-sonnet-4-5-20250929"
            />
            <Input
              label="API Key Override"
              value={apiKeyOverride}
              onChange={(e) => setApiKeyOverride(e.target.value)}
              placeholder="Leave blank to use workspace key"
              type="password"
            />
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-fg-3">
                Temperature {temperature ? `(${temperature})` : ''}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature || '0.7'}
                onChange={(e) => setTemperature(e.target.value)}
                className="mt-1 w-full accent-blue"
              />
            </div>
            <Input
              label="Max Tokens"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 4096"
              type="text"
              inputMode="numeric"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || !name || !title || !soul || skills.length === 0 || !teamId}>
          Create
        </Button>
      </div>
    </form>
  );
}
