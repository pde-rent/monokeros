'use client';

import { Dialog } from '@monokeros/ui';
import { CreateWorkspaceForm } from './create-workspace-form';
import type { WorkspaceInfo } from '@/stores/workspace-store';
import { PlusIcon } from '@phosphor-icons/react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (ws: WorkspaceInfo) => void;
}

export function CreateWorkspaceDialog({ open, onClose, onCreated }: Props) {
  function handleCreated(ws: WorkspaceInfo) {
    if (onCreated) {
      onCreated(ws);
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create Workspace"
      icon={<PlusIcon size={14} weight="bold" />}
      width={480}
    >
      <CreateWorkspaceForm onCreated={handleCreated} onCancel={onClose} />
    </Dialog>
  );
}
