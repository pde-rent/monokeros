"use client";

import { Input, Textarea, ColorPicker } from "@monokeros/ui";
import { LogoUpload } from "./logo-upload";
import { TelegramSetup } from "./telegram-setup";
import type { useImageUpload } from "@/hooks/use-image-upload";

export interface WorkspaceFormValues {
  name: string;
  slug: string;
  description: string;
  color: string;
  telegramToken: string;
}

interface Props {
  values: WorkspaceFormValues;
  onNameChange: (value: string) => void;
  onSlugChange?: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onTelegramTokenChange: (value: string) => void;
  logo: ReturnType<typeof useImageUpload>;
  slugReadOnly?: boolean;
}

export function WorkspaceFormFields({
  values,
  onNameChange,
  onSlugChange,
  onDescriptionChange,
  onColorChange,
  onTelegramTokenChange,
  logo,
  slugReadOnly,
}: Props) {
  return (
    <>
      {/* Name + Logo row */}
      <div className="flex gap-3">
        <LogoUpload upload={logo} color={values.color} fallback={values.name} />
        <div className="flex-1">
          <Input
            label="Name"
            value={values.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="My Workspace"
            required
          />
        </div>
      </div>

      {/* Slug */}
      {slugReadOnly ? (
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-fg-3">Slug</label>
          <p className="mt-1 text-xs text-fg-3">/{values.slug}</p>
        </div>
      ) : (
        <>
          <Input
            label="Slug"
            value={values.slug}
            onChange={(e) => onSlugChange?.(e.target.value)}
            placeholder="my-workspace"
            required
          />
          <p className="-mt-3 text-xs text-fg-3">URL: /{values.slug || "..."}/org</p>
        </>
      )}

      {/* Description */}
      <Textarea
        label="Description"
        value={values.description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="What is this workspace for?"
        rows={2}
      />

      <ColorPicker value={values.color} onChange={onColorChange} />

      <TelegramSetup token={values.telegramToken} onTokenChange={onTelegramTokenChange} />
    </>
  );
}
