'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore, type WorkspaceInfo } from '@/stores/workspace-store';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Input, Textarea } from '@monokeros/ui';
import { ArrowLeftIcon, UsersIcon, UsersFourIcon, XIcon, CheckIcon, PackageIcon, SpinnerIcon, FileXIcon } from '@phosphor-icons/react';
import type { TemplateManifest } from '@monokeros/templates';
import { PRESET_COLORS } from '@monokeros/constants';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;
  const { isAuthenticated } = useAuthStore();
  const { addWorkspace } = useWorkspaceStore();

  const [template, setTemplate] = useState<TemplateManifest | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);

  // Selection state for agents/teams
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());

  // Submit state
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    api.templates.detail(templateId).then((data) => {
      setTemplate(data);
      setName(data.displayName);
      setSlug(slugify(data.displayName));
      setDescription(data.workspace.spec.description || '');
      setColor(data.workspace.spec.branding?.color || PRESET_COLORS[0]);
      // Pre-select all agents and teams
      setSelectedAgentIds(new Set(data.agents.map((a) => a.metadata.name)));
      setSelectedTeamIds(new Set(data.teams.map((t) => t.metadata.name)));
      setLoading(false);
    });
  }, [isAuthenticated, router, templateId]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedLogo(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;
    setError('');
    setDeploying(true);

    try {
      const ws = await api.templates.apply(template.id, {
        slug,
        displayName: name,
        branding: { color, logo: uploadedLogo ?? undefined },
        description,
        includeAgents: [...selectedAgentIds],
        includeTeams: [...selectedTeamIds],
      });

      const info: WorkspaceInfo = {
        id: ws.id,
        slug: ws.slug,
        displayName: ws.displayName,
        role: 'admin',
        branding: ws.branding,
        industry: ws.industry,
      };

      addWorkspace(info);
      router.push(`/${ws.slug}/org`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-2 bg-canvas text-xs text-fg-3">
        {loading ? (
          <>
            <SpinnerIcon size={24} className="animate-spin" />
            Loading...
          </>
        ) : null}
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-2 bg-canvas text-xs text-fg-3">
        <FileXIcon size={24} />
        Template not found
      </div>
    );
  }

  const activeColor = color;
  const canSubmit = name.trim() && slug.trim();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-edge bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push('/marketplace')}
            className="flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg-2"
          >
            <ArrowLeftIcon size={14} />
            Marketplace
          </button>
          <div className="flex items-center gap-2">
            <img src="/icons/logo.svg" alt="" className="h-6 w-6" />
            <h1 className="text-sm font-bold tracking-tight font-display text-fg">{template.displayName}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex gap-8">
          {/* Left Column (2/3) */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Deploy Form */}
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-fg">Deploy Workspace</h3>
              <form onSubmit={handleDeploy} className="space-y-4">
                {error && (
                  <div className="border border-red bg-red-light px-3 py-2 text-xs text-red rounded-sm">
                    {error}
                  </div>
                )}

                {/* Name + Logo row */}
                <div className="flex gap-3">
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
                  <div className="flex-1">
                    <Input
                      label="Name"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="My Workspace"
                      required
                    />
                  </div>
                </div>

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

                {/* Teams selection */}
                {template.teams.length > 0 && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-fg-3 mb-1.5">
                      Teams ({selectedTeamIds.size}/{template.teams.length})
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                      {template.teams.map((team) => {
                        const isSelected = selectedTeamIds.has(team.metadata.name);
                        return (
                          <button
                            key={team.metadata.name}
                            type="button"
                            onClick={() => toggleTeam(team.metadata.name)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs transition-colors ${
                              isSelected ? 'bg-blue-light text-fg' : 'text-fg-2 hover:bg-surface-3'
                            }`}
                          >
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: team.spec.color }}
                            />
                            <span className="flex-1 text-left truncate">{team.spec.displayName}</span>
                            {isSelected && <CheckIcon size={12} className="text-blue shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Agents selection */}
                {template.agents.length > 0 && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-fg-3 mb-1.5">
                      Agents ({selectedAgentIds.size}/{template.agents.length})
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {template.agents.map((agent) => {
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
                            {isSelected && <CheckIcon size={12} className="text-blue shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={deploying || !canSubmit} fullWidth>
                    {deploying ? 'Deploying...' : 'Deploy Workspace'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => router.push('/marketplace')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>

            {/* Template Info */}
            <div className="flex items-center gap-3 text-xs text-fg-3">
              <span className="flex items-center gap-1">
                <UsersIcon size={12} /> {template.agentCount} agents
              </span>
              <span className="flex items-center gap-1">
                <UsersFourIcon size={12} /> {template.teamCount} teams
              </span>
              <Badge>{template.category}</Badge>
            </div>

            {/* Long Description */}
            {template.longDescription && (
              <div className="text-xs leading-relaxed text-fg-2 whitespace-pre-line">
                {template.longDescription.split('\n').map((line, i) => {
                  if (line.startsWith('## '))
                    return (
                      <h2 key={i} className="mb-2 mt-4 text-sm font-bold text-fg">
                        {line.replace('## ', '')}
                      </h2>
                    );
                  if (line.startsWith('### '))
                    return (
                      <h3 key={i} className="mb-1 mt-3 text-xs font-semibold text-fg">
                        {line.replace('### ', '')}
                      </h3>
                    );
                  if (line.startsWith('- '))
                    return (
                      <div key={i} className="ml-3 flex gap-1.5">
                        <span className="text-fg-3">&bull;</span>
                        <span>{line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
                      </div>
                    );
                  return line ? <p key={i}>{line}</p> : null;
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3">
                  <PackageIcon size={20} className="text-fg-2" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-fg">{template.displayName}</div>
                  <div className="text-xs text-fg-3">{template.author}</div>
                </div>
              </div>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-fg-3">Version</dt>
                  <dd className="text-fg">{template.version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fg-3">Category</dt>
                  <dd className="text-fg capitalize">{template.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fg-3">Pricing</dt>
                  <dd className="text-fg capitalize">{template.pricing}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
