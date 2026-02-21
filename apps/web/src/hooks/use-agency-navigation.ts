'use client';

import { useRouter, useParams } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { useDiagramStore } from '@/stores/diagram-store';
import { useChatStore } from '@/stores/chat-store';
import { useProjects } from '@/hooks/use-queries';
import { DiagramViewMode } from '@monokeros/types';
import { buildSearchKey } from '@monokeros/utils';

export function useAgencyNavigation() {
  const router = useRouter();
  const { workspace: slug } = useParams<{ workspace: string }>();
  const { openDetailPanel } = useUIStore();
  const { setHighlightedNode, setViewMode: setDiagramViewMode, setSearch: setDiagramSearch } = useDiagramStore();
  const { setActiveConversation } = useChatStore();
  const { data: projects } = useProjects();

  function getProjectSlug(projectId: string): string {
    return projects?.find((p) => p.id === projectId)?.slug ?? projectId;
  }

  function goToAgentDiagram(agentId: string) {
    router.push(`/${slug}/org`);
    setHighlightedNode(agentId);
    openDetailPanel('agent', agentId);
  }

  function goToAgentOrg(agentName: string) {
    router.push(`/${slug}/org`);
    setDiagramSearch(agentName);
  }

  function goToAgentTasks(agentName: string) {
    router.push(`/${slug}/projects/list?search=${encodeURIComponent(buildSearchKey('assigned', agentName))}`);
  }

  function goToAgentProjects(agentName: string) {
    router.push(`/${slug}/projects?search=${encodeURIComponent(buildSearchKey('with', agentName))}`);
  }

  function goToAgentChat(agentId: string) {
    router.push(`/${slug}/chat/${agentId}`);
  }

  function goToAgentFiles(agentId: string) {
    router.push(`/${slug}/files?agent=${agentId}`);
  }

  function goToAgentConsole(agentId: string, conversationId?: string) {
    router.push(conversationId ? `/${slug}/chat/${agentId}` : `/${slug}/chat`);
    if (conversationId) {
      setActiveConversation(conversationId);
    }
  }

  function goToIssueDetail(projectId: string, _issueId: string) {
    router.push(`/${slug}/projects/${getProjectSlug(projectId)}/kanban`);
  }

  function goToProjectDiagram(projectId: string) {
    router.push(`/${slug}/org`);
    setDiagramViewMode(DiagramViewMode.PROJECT);
    useDiagramStore.getState().setProjectFilter(projectId);
  }

  function goToProjectDetail(projectId: string) {
    router.push(`/${slug}/projects/${getProjectSlug(projectId)}/kanban`);
  }

  function goToTaskDetail(projectId: string | null, taskId: string) {
    if (projectId) {
      router.push(`/${slug}/projects/${getProjectSlug(projectId)}/kanban`);
    } else {
      router.push(`/${slug}/projects/kanban`);
    }
    openDetailPanel('task', taskId);
  }

  function goToProjectChat(projectId: string) {
    router.push(`/${slug}/chat?project=${projectId}`);
  }

  function goToProjectFiles(projectId: string) {
    router.push(`/${slug}/files/tree?project=${projectId}`);
  }

  function goToFile(fileId: string) {
    router.push(`/${slug}/files/tree?fileId=${fileId}`);
  }

  return {
    goToAgentDiagram,
    goToAgentOrg,
    goToAgentTasks,
    goToAgentProjects,
    goToAgentChat,
    goToAgentFiles,
    goToAgentConsole,
    goToIssueDetail,
    goToProjectDiagram,
    goToProjectDetail,
    goToTaskDetail,
    goToProjectChat,
    goToProjectFiles,
    goToFile,
  };
}
