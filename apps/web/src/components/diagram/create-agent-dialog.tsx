'use client';

import { Dialog } from '@monokeros/ui';
import { useCreateMember } from '@/hooks/use-queries';
import { CreateAgentForm } from './create-agent-form';
import type { CreateMemberInput } from '@monokeros/types';
import { UserPlusIcon } from '@phosphor-icons/react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateAgentDialog({ open, onClose }: Props) {
  const createMember = useCreateMember();

  function handleSubmit(data: CreateMemberInput) {
    createMember.mutate(data, {
      onSuccess: () => onClose(),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Agent"
      icon={<UserPlusIcon size={14} weight="bold" />}
      width={520}
    >
      <CreateAgentForm onSubmit={handleSubmit} onCancel={onClose} isSubmitting={createMember.isPending} />
    </Dialog>
  );
}
