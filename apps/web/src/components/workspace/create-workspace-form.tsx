'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Input, Textarea, Card } from '@monokeros/ui';
import { api } from '@/lib/api-client';
import { useWorkspaceStore, type WorkspaceInfo } from '@/stores/workspace-store';
import { useRouter } from 'next/navigation';
import type { TemplateManifest, TemplateListing } from '@monokeros/templates';
import { UploadSimpleIcon, XIcon, CheckIcon, MagnifyingGlassIcon, FileDottedIcon, TelegramLogoIcon, PackageIcon } from '@phosphor-icons/react';
import { PRESET_COLORS } from '@monokeros/constants';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface Props {
  onCancel?: () => void;
  onCreated?: (ws: WorkspaceInfo) => void;
}

export function CreateWorkspaceForm({ onCancel, onCreated }: Props) {
  const router = useRouter();
  const { addWorkspace } = useWorkspaceStore();

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [customColor, setCustomColor] = useState('');
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState('');
  const [showTelegram, setShowTelegram] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<TemplateListing[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateManifest | null>(null);
  const [templateDetailLoading, setTemplateDetailLoading] = useState(false);

  // Selection state for agents/teams from template
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());

  // Search/filter state
  const [templateSearch, setTemplateSearch] = useState('');

  // Submit state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates on mount
  useEffect(() => {
    api.templates.list().then(setTemplates).catch(() => {});
  }, []);

  // Handle name change -> auto-slug
  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  // Load template detail when selected
  async function handleSelectTemplate(id: string | null) {
    if (!id) {
      setSelectedTemplate(null);
      setSelectedAgentIds(new Set());
      setSelectedTeamIds(new Set());
      return;
    }
    setTemplateDetailLoading(true);
    try {
      const detail = await api.templates.detail(id);
      setSelectedTemplate(detail);
      // Pre-select all agents and teams
      setSelectedAgentIds(new Set(detail.agents.map((a) => a.metadata.name)));
      setSelectedTeamIds(new Set(detail.teams.map((t) => t.metadata.name)));
    } catch {
      setSelectedTemplate(null);
    } finally {
      setTemplateDetailLoading(false);
    }
  }

  // Toggle agent/team selection
  function toggleAgent(id: string) {
    const next = new Set(selectedAgentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAgentIds(next);
  }

  function toggleTeam(id: string) {
    const next = new Set(selectedTeamIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTeamIds(next);
  }

  // File upload handler
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedLogo(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let ws;
      if (selectedTemplate) {
        // Apply template with selected agents/teams
        ws = await api.templates.apply(selectedTemplate.id, {
          slug,
          displayName: name,
          branding: { color, logo: uploadedLogo ?? undefined },
          description,
          includeAgents: [...selectedAgentIds],
          includeTeams: [...selectedTeamIds],
        });
      } else {
        // Create blank workspace
        ws = await api.workspaces.create({
          name: slug,
          slug,
          displayName: name,
          branding: { color, logo: uploadedLogo ?? undefined },
          ...(telegramToken && { telegramBotToken: telegramToken }),
        });
      }

      const info: WorkspaceInfo = {
        id: ws.id,
        slug: ws.slug,
        displayName: ws.displayName,
        role: ws.role ?? 'admin',
        branding: ws.branding,
        industry: ws.industry,
      };

      addWorkspace(info);

      if (onCreated) {
        onCreated(info);
      } else {
        router.push(`/${ws.slug}/org`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  }

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(
      (t) =>
        t.displayName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q))
    );
  }, [templates, templateSearch]);

  const activeColor = color;
  const canSubmit = name.trim() && slug.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="border border-red bg-red-light px-3 py-2 text-xs text-red rounded-sm">
          {error}
        </div>
      )}

      {/* Name + Logo row */}
      <div className="flex gap-3">
        {/* Logo/Color */}
        <div className="shrink-0">
          <label className="text-xs font-medium uppercase tracking-wider text-fg-3">Logo</label>
          <div className="mt-1 relative">
            <div
              className="h-12 w-12 rounded-lg border border-edge overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: activeColor }}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedLogo ? (
                <img src={uploadedLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-white text-lg font-bold">
                  {name.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </div>
            {uploadedLogo && (
              <button
                type="button"
                onClick={() => setUploadedLogo(null)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-1 border border-edge text-fg-3 hover:text-red"
              >
                <XIcon size={10} weight="bold" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Name + Slug */}
        <div className="flex-1 space-y-3">
          <Input
            label="Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Workspace"
            required
          />
        </div>
      </div>

      {/* Slug */}
      <Input
        label="Slug"
        value={slug}
        onChange={(e) => {
          setSlug(slugify(e.target.value));
          setSlugTouched(true);
        }}
        placeholder="my-workspace"
        required
      />
      <p className="-mt-3 text-xs text-fg-3">URL: /{slug || '...'}/org</p>

      {/* Description */}
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What is this workspace for?"
        rows={2}
      />

      {/* Color picker */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-fg-3">Color</label>
        <div className="mt-1.5 flex items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
              }}
              className={`h-6 w-6 rounded-md border-2 transition-all ${
                color === c ? 'border-fg scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Communication Channels */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-fg-3">
          Communication
        </label>
        <div className="mt-2 space-y-2">
          {/* Telegram */}
          <div className="flex items-center gap-2 p-2 rounded-md border border-edge bg-surface-2">
            <TelegramLogoIcon size={18} className="text-[#0088cc] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-fg">Telegram</div>
              <div className="text-[10px] text-fg-3">Connect your Telegram bot</div>
            </div>
            <button
              type="button"
              onClick={() => setShowTelegram(!showTelegram)}
              className="text-xs text-blue hover:underline shrink-0"
            >
              {showTelegram ? 'Cancel' : 'Setup'}
            </button>
          </div>
          {showTelegram && (
            <div className="pl-7 space-y-1">
              <Input
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="123456:ABC-DEF..."
              />
              <p className="text-xs text-fg-3">Get a token from @BotFather on Telegram</p>
            </div>
          )}
        </div>
      </div>

      {/* Template selection */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-fg-3">
          Start from Template (optional)
        </label>
        <div className="mt-1.5 space-y-2">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3"
            />
            <input
              type="text"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-md border border-edge bg-surface-2 py-1.5 pl-8 pr-3 text-xs text-fg outline-none placeholder:text-fg-3 focus:border-blue"
            />
          </div>

          {/* Template list */}
          <div className="max-h-40 overflow-y-auto rounded-md border border-edge">
            <button
              type="button"
              onClick={() => handleSelectTemplate(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                !selectedTemplate
                  ? 'bg-blue-light text-fg'
                  : 'text-fg-2 hover:bg-surface-3'
              }`}
            >
              <FileDottedIcon size={14} className="text-fg-3 shrink-0" />
              <span>Blank workspace</span>
            </button>
            {filteredTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors border-t border-edge ${
                  selectedTemplate?.id === tpl.id
                    ? 'bg-blue-light text-fg'
                    : 'text-fg-2 hover:bg-surface-3'
                }`}
              >
                <PackageIcon size={14} className="text-fg-3 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{tpl.displayName}</div>
                  <div className="text-fg-3">
                    {tpl.agentCount} agents, {tpl.teamCount} teams
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template detail: agent/team selection */}
      {selectedTemplate && (
        <Card className="p-3 space-y-3">
          <div className="text-xs font-medium text-fg">{selectedTemplate.displayName}</div>

          {/* Teams */}
          {selectedTemplate.teams.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-fg-3 mb-1.5">
                Teams to include
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {selectedTemplate.teams.map((team) => {
                  const isSelected = selectedTeamIds.has(team.metadata.name);
                  return (
                    <button
                      key={team.metadata.name}
                      type="button"
                      onClick={() => toggleTeam(team.metadata.name)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs transition-colors ${
                        isSelected ? 'bg-blue-light text-fg' : 'text-fg-2 hover:bg-surface-3'
                      }`}
                    >
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: team.spec.color }}
                      />
                      <span className="flex-1 text-left truncate">{team.spec.displayName}</span>
                      {isSelected && <CheckIcon size={12} className="text-blue" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agents */}
          {selectedTemplate.agents.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-fg-3 mb-1.5">
                Agents to include
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {selectedTemplate.agents.map((agent) => {
                  const isSelected = selectedAgentIds.has(agent.metadata.name);
                  return (
                    <button
                      key={agent.metadata.name}
                      type="button"
                      onClick={() => toggleAgent(agent.metadata.name)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs transition-colors ${
                        isSelected ? 'bg-blue-light text-fg' : 'text-fg-2 hover:bg-surface-3'
                      }`}
                    >
                      <span className="flex-1 text-left truncate">
                        <span className="font-medium">{agent.spec.displayName}</span>
                        <span className="text-fg-3 ml-1">· {agent.spec.title}</span>
                      </span>
                      {isSelected && <CheckIcon size={12} className="text-blue" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={loading || !canSubmit}
          fullWidth
        >
          {loading ? 'Creating...' : 'Create Workspace'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
