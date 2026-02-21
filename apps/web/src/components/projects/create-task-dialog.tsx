'use client';

import { Dialog } from '@monokeros/ui';
import { useCreateTask } from '@/hooks/use-queries';
import type { CreateTaskInput } from '@monokeros/types';
import { CreateTaskForm } from './create-task-form';
import { ListPlusIcon } from '@phosphor-icons/react';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateTaskDialog({ open, onClose, projectId }: Props) {
  const createTask = useCreateTask();

  function handleSubmit(data: CreateTaskInput) {
    createTask.mutate(data, {
      onSuccess: () => onClose(),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Task"
      icon={<ListPlusIcon size={14} weight="bold" />}
      width={520}
    >
      <CreateTaskForm
        projectId={projectId}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={createTask.isPending}
      />
    </Dialog>
  );
}
