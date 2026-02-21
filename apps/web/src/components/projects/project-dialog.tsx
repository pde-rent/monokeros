'use client';

import { Dialog } from '@monokeros/ui';
import { useCreateProject, useUpdateProject } from '@/hooks/use-queries';
import { ProjectForm } from './project-form';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@monokeros/types';
import { FolderPlusIcon, PencilSimpleIcon } from '@phosphor-icons/react';

interface Props {
  project?: Project;
  open: boolean;
  onClose: () => void;
}

export function ProjectDialog({ project, open, onClose }: Props) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const isEdit = !!project;
  const isPending = isEdit ? updateProject.isPending : createProject.isPending;

  function handleSubmit(data: Partial<CreateProjectInput>) {
    if (isEdit) {
      updateProject.mutate({ id: project.id, data: data as Partial<UpdateProjectInput> }, {
        onSuccess: () => onClose(),
      });
    } else {
      createProject.mutate(data, {
        onSuccess: () => onClose(),
      });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Project' : 'New Project'}
      icon={isEdit
        ? <PencilSimpleIcon size={14} weight="bold" />
        : <FolderPlusIcon size={14} weight="bold" />
      }
      width={520}
    >
      <ProjectForm
        initial={project}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isPending}
      />
    </Dialog>
  );
}
