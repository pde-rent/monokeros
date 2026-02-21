'use client';

import { useState } from 'react';
import { WarningIcon } from '@phosphor-icons/react';
import { Dialog, Button, Input } from '@monokeros/ui';
import { api } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface Props {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  workspace: { id: string; slug: string; displayName: string };
}

export function DeleteWorkspaceDialog({ open, onClose, onDeleted, workspace }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { removeWorkspace } = useWorkspaceStore();

  const canConfirm = confirmText === workspace.slug;

  async function handleDelete() {
    if (!canConfirm) return;
    setError('');
    setLoading(true);
    try {
      await api.workspaces.delete(workspace.slug, confirmText);
      removeWorkspace(workspace.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setConfirmText('');
    setError('');
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
        {error && (
          <div className="border border-red bg-red-light px-3 py-2 text-xs text-red rounded-sm">
            {error}
          </div>
        )}

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
            {loading ? 'Deleting...' : 'Delete this workspace'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
