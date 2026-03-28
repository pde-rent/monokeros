import React from "react";

interface PendingFileBadgeProps {
  fileName: string;
  onRemove: () => void;
  maxWidth?: string;
}

/**
 * A badge for displaying pending file attachments with a remove button.
 * Pattern: rounded-sm border bg px-2 py-1 text-xs
 */
export function PendingFileBadge({
  fileName,
  onRemove,
  maxWidth = "140px",
}: PendingFileBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-sm border border-edge bg-surface px-2 py-1 text-xs">
      <span className="truncate text-fg" style={{ maxWidth }}>
        {fileName}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-fg-3 hover:text-red text-[10px] transition-colors"
      >
        &times;
      </button>
    </div>
  );
}
