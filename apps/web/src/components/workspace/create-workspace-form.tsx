"use client";

import { useState, useMemo } from "react";
import { Button, FormError } from "@monokeros/ui";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, FileDottedIcon, PackageIcon } from "@phosphor-icons/react";
import { PRESET_COLORS } from "@monokeros/constants";
import { useNameWithSlug } from "@/hooks/use-name-with-slug";
import { WorkspaceFormFields } from "./workspace-form-fields";

interface Props {
  onCancel?: () => void;
  onCreated?: (ws: { slug: string; displayName: string }) => void;
}

export function CreateWorkspaceForm({ onCancel, onCreated }: Props) {
  const router = useRouter();
  const createWorkspace = useMutation(api.workspaces.create);
  const applyTemplate = useMutation(api.templates.apply);
  const templates = useQuery(api.templates.list, {});

  // Form state
  const { name, slug, handleNameChange, handleSlugChange } = useNameWithSlug();
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const logo = useImageUpload();
  const [telegramToken, setTelegramToken] = useState("");

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = useMemo(
    () => templates?.find((t: any) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  // Search/filter state
  const [templateSearch, setTemplateSearch] = useState("");

  // Submit state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (selectedTemplateId) {
        await applyTemplate({
          templateId: selectedTemplateId,
          slug,
          displayName: name,
          workspaceName: name,
        });
      } else {
        await createWorkspace({
          slug,
          displayName: name,
          name,
          description,
          industry: "custom",
        });
      }

      if (onCreated) {
        onCreated({ slug, displayName: name });
      } else {
        router.push(`/${slug}/org`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  }

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!templateSearch) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter((t: any) => (t.displayName ?? t.name ?? "").toLowerCase().includes(q));
  }, [templates, templateSearch]);

  const canSubmit = name.trim() && slug.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormError error={error} />

      <WorkspaceFormFields
        values={{ name, slug, description, color, telegramToken }}
        onNameChange={handleNameChange}
        onSlugChange={handleSlugChange}
        onDescriptionChange={setDescription}
        onColorChange={setColor}
        onTelegramTokenChange={setTelegramToken}
        logo={logo}
      />

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
              onClick={() => setSelectedTemplateId(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                !selectedTemplate ? "bg-blue-light text-fg" : "text-fg-2 hover:bg-surface-3"
              }`}
            >
              <FileDottedIcon size={14} className="text-fg-3 shrink-0" />
              <span>Blank workspace</span>
            </button>
            {filteredTemplates.map((tpl: any) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors border-t border-edge ${
                  selectedTemplateId === tpl.id
                    ? "bg-blue-light text-fg"
                    : "text-fg-2 hover:bg-surface-3"
                }`}
              >
                <PackageIcon size={14} className="text-fg-3 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{tpl.displayName ?? tpl.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading || !canSubmit} fullWidth>
          {loading ? "Creating..." : "Create Workspace"}
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
