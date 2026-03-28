"use client";

import { XIcon } from "@phosphor-icons/react";
import type { useImageUpload } from "@/hooks/use-image-upload";

interface LogoUploadProps {
  /** Return value of useImageUpload() */
  upload: ReturnType<typeof useImageUpload>;
  /** Background colour shown behind the fallback letter */
  color: string;
  /** Fallback letter when no image is uploaded */
  fallback: string;
}

export function LogoUpload({ upload, color, fallback }: LogoUploadProps) {
  return (
    <div className="shrink-0">
      <label className="text-xs font-medium uppercase tracking-wider text-fg-3">Logo</label>
      <div className="mt-1 relative">
        <div
          className="h-12 w-12 rounded-lg border border-edge overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: color }}
          onClick={upload.openFilePicker}
        >
          {upload.imageUrl ? (
            <img src={upload.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-white text-lg font-bold">
              {fallback.charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>
        {upload.imageUrl && (
          <button
            type="button"
            onClick={upload.clearImage}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-1 border border-edge text-fg-3 hover:text-red"
          >
            <XIcon size={10} weight="bold" />
          </button>
        )}
        <input
          ref={upload.fileInputRef}
          type="file"
          accept="image/*"
          onChange={upload.handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}
