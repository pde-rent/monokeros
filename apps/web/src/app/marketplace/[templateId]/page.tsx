"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import { Badge, Button, Card, Input, Textarea, ColorPicker } from "@monokeros/ui";
import {
  ArrowLeftIcon,
  UsersIcon,
  UsersFourIcon,
  PackageIcon,
  SpinnerIcon,
  FileXIcon,
} from "@phosphor-icons/react";
import { PRESET_COLORS } from "@monokeros/constants";
import { slugify } from "@monokeros/utils";
import { useImageUpload } from "@/hooks/use-image-upload";
import { LogoUpload } from "@/components/workspace/logo-upload";

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const applyTemplate = useMutation(convexApi.templates.apply);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const logo = useImageUpload();

  // Submit state
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState("");

  const template = useQuery(convexApi.templates.get, isAuthenticated ? { templateId } : "skip");
  const loading = template === undefined;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (template && !name) {
      setName(template.name);
      setSlug(slugify(template.name));
    }
  }, [authLoading, isAuthenticated, router, template, name]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;
    setError("");
    setDeploying(true);

    try {
      await applyTemplate({
        templateId: template.id,
        slug,
        displayName: name,
        workspaceName: name,
      });

      router.push(`/${slug}/org`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
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

  const canSubmit = name.trim() && slug.trim();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-edge bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push("/marketplace")}
            className="flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg-2"
          >
            <ArrowLeftIcon size={14} />
            Marketplace
          </button>
          <div className="flex items-center gap-2">
            <img src="/icons/logo.svg" alt="" className="h-6 w-6" />
            <h1 className="text-sm font-bold tracking-tight font-display text-fg">
              {template.name}
            </h1>
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
                  <LogoUpload upload={logo} color={color} fallback={name} />
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
                <p className="-mt-3 text-xs text-fg-3">URL: /{slug || "..."}/org</p>

                <Textarea
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this workspace for?"
                  rows={2}
                />

                <ColorPicker value={color} onChange={setColor} />

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={deploying || !canSubmit} fullWidth>
                    {deploying ? "Deploying..." : "Deploy Workspace"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => router.push("/marketplace")}>
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
              <Badge>{template.industry}</Badge>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3">
                  <PackageIcon size={20} className="text-fg-2" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-fg">{template.name}</div>
                  <div className="text-xs text-fg-3">{template.industry}</div>
                </div>
              </div>
              <p className="text-xs text-fg-2 leading-relaxed">{template.description}</p>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
