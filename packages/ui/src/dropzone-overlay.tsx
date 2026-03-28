import React from "react";
import { CloudArrowUpIcon } from "@phosphor-icons/react";

interface DropzoneOverlayProps {
  visible: boolean;
  label?: string;
  icon?: React.ReactNode;
}

/**
 * A full-screen drop zone overlay for file drag-and-drop.
 * Pattern: fixed inset-0 z-40 flex items-center justify-center with dashed border box
 */
export function DropzoneOverlay({
  visible,
  label = "Drop files here",
  icon,
}: DropzoneOverlayProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-surface/80">
      <div className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-blue bg-surface-2 px-12 py-8">
        {icon ?? <CloudArrowUpIcon size={32} className="text-blue" />}
        <span className="text-sm font-medium text-fg">{label}</span>
      </div>
    </div>
  );
}
