import { useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTasks, useProjects } from '@/hooks/use-queries';
import { useTaskFiltering } from '@/hooks/use-task-filtering';
import { useUIStore } from '@/stores/ui-store';
import type { ProjectViewMode } from '@monokeros/types';

export function useProjectPageView(initialProjectRef?: string) {
  const router = useRouter();
  const { workspace: slug } = useParams<{ workspace: string }>();
  const { openDetailPanel, closeDetailPanel } = useUIStore();
  const { data: projects } = useProjects();

  // Resolve the initial URL param (slug or id) to a project id
  const _projectsLoaded = !!projects;
  const resolvedInitialId = useMemo(() => {
    if (!initialProjectRef || !projects) return undefined;
    // Try slug match first, then id match
    const bySlug = projects.find((p) => p.slug === initialProjectRef);
    if (bySlug) return bySlug.id;
    const byId = projects.find((p) => p.id === initialProjectRef);
    if (byId) return byId.id;
    return undefined;
  }, [initialProjectRef, projects]);

  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskIdRaw] = useState<string | null>(null);

  // Sync activeProjectId when slug resolution completes
  if (resolvedInitialId && resolvedInitialId !== activeProjectId) {
    setActiveProjectId(resolvedInitialId);
  }

  const setSelectedTaskId = useCallback((taskId: string | null) => {
    setSelectedTaskIdRaw(taskId);
    if (taskId) {
      openDetailPanel('task', taskId);
    } else {
      closeDetailPanel();
    }
  }, [openDetailPanel, closeDetailPanel]);

  const { data: tasks } = useTasks(
    activeProjectId ? { projectId: activeProjectId } : undefined,
  );

  const filteredTasks = useTaskFiltering(tasks, statusFilter, search);
  const selectedTask = tasks?.find((t) => t.id === selectedTaskId) ?? null;

  function getProjectSlug(projectId: string): string {
    return projects?.find((p) => p.id === projectId)?.slug ?? projectId;
  }

  function handleViewModeChange(mode: ProjectViewMode) {
    const projectSlug = activeProjectId ? getProjectSlug(activeProjectId) : null;
    const base = projectSlug ? `/${slug}/projects/${projectSlug}` : `/${slug}/projects`;
    router.push(`${base}/${mode}`);
  }

  return {
    activeProjectId,
    setActiveProjectId,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    search,
    setSearch,
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    filteredTasks,
    selectedTask,
    handleViewModeChange,
  };
}
