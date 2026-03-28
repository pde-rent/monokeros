"use client";

import { useState } from "react";
import { WarningIcon } from "@phosphor-icons/react";
import { Dialog, Button, Input, FormError } from "@monokeros/ui";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  workspace: { _id?: string; id?: string; slug: string; displayName: string };
}

export function DeleteWorkspaceDialog({ open, onClose, onDeleted, workspace }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const removeWorkspace = useMutation(api.workspaces.remove);

  const canConfirm = confirmText === workspace.slug;

  async function handleDelete() {
    if (!canConfirm) return;
    setError("");
    setLoading(true);
    try {
      const wsId = (workspace as any)._id ?? (workspace as any).id;
      await removeWorkspace({ workspaceId: wsId, confirmName: workspace.slug } as any);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workspace");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setConfirmText("");
    setError("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Delete workspace"
      icon={<WarningIcon size={14} className="text-red" />}
      width={420}
    >
      <div className="space-y-4">
        <FormError error={error} />

        <p className="text-xs text-fg-2 leading-relaxed">
          This action <strong className="text-fg">cannot be undone</strong>. This will permanently
          delete the <strong className="text-fg">{workspace.displayName}</strong> workspace, all its
          projects, tasks, conversations, and data.
        </p>

        <div>
          <label className="text-xs text-fg-3 block mb-1.5">
            To confirm, type <strong className="text-fg">{workspace.slug}</strong> below
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={workspace.slug}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!canConfirm || loading}
            onClick={handleDelete}
          >
            {loading ? "Deleting..." : "Delete this workspace"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
