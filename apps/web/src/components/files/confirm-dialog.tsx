"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { Dialog, Button } from "@monokeros/ui";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog
      open={true}
      onClose={onCancel}
      title={title}
      icon={<WarningIcon size={14} className="text-red" />}
      width={360}
    >
      <div className="space-y-4">
        <p className="text-xs text-fg-2">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
