'use client';

import { useQuery, useMutation, invalidateQueries } from '@/lib/query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useWorkspaceSlug } from './use-workspace-slug';
import { RUNTIME_POLL_INTERVAL_MS, RENDER_STALE_TIME_MS, NOTIFICATION_POLL_INTERVAL_MS } from '@monokeros/constants';
import type { CreateMemberInput, CreateTaskInput, CreateProjectInput, UpdateProjectInput, MessageReference } from '@monokeros/types';

export function useMembers(opts?: { enabled?: boolean }) {
  const slug = useWorkspaceSlug();
  return useQuery({ queryKey: [...queryKeys.members.all, slug], queryFn: () => api.members.list(slug), enabled: !!slug && opts?.enabled !== false });
}

export function useTeams(opts?: { enabled?: boolean }) {
  const slug = useWorkspaceSlug();
  return useQuery({ queryKey: [...queryKeys.teams.all, slug], queryFn: () => api.teams.list(slug), enabled: !!slug && opts?.enabled !== false });
}

export function useConversations(opts?: { enabled?: boolean }) {
  const slug = useWorkspaceSlug();
  return useQuery({ queryKey: [...queryKeys.conversations.all, slug], queryFn: () => api.conversations.list(slug), enabled: !!slug && opts?.enabled !== false });
}

export function useProjects(params?: { status?: string; type?: string; search?: string }, opts?: { enabled?: boolean }) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: params ? [...queryKeys.projects.list(params), slug] : [...queryKeys.projects.all, slug],
    queryFn: () => api.projects.list(slug, params),
    enabled: !!slug && opts?.enabled !== false,
  });
}

export function useTasks(params?: { projectId?: string; status?: string }, opts?: { enabled?: boolean }) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.tasks.list(params), slug],
    queryFn: () => api.tasks.list(slug, params),
    enabled: !!slug && opts?.enabled !== false,
  });
}

export function useConversation(id: string | null, opts?: { refetchInterval?: number }) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.conversations.detail(id ?? ''), slug],
    queryFn: () => api.conversations.detail(slug, id!),
    enabled: !!id && !!slug,
    refetchInterval: opts?.refetchInterval,
  });
}

export function useDrives(opts?: { enabled?: boolean }) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.files.drives, slug],
    queryFn: () => api.files.drives(slug),
    enabled: !!slug && opts?.enabled !== false,
  });
}

export function useTeamDrive(teamId: string | null) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.files.teamDrive(teamId ?? ''), slug],
    queryFn: () => api.files.teamDrive(slug, teamId!),
    enabled: !!teamId && !!slug,
  });
}

export function useMemberDrive(memberId: string | null) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.files.memberDrive(memberId ?? ''), slug],
    queryFn: () => api.files.memberDrive(slug, memberId!),
    enabled: !!memberId && !!slug,
  });
}

export function useProjectDrive(projectId: string | null) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.files.projectDrive(projectId ?? ''), slug],
    queryFn: () => api.files.projectDrive(slug, projectId!),
    enabled: !!projectId && !!slug,
  });
}

export function useWorkspaceDrive() {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.files.workspaceDrive, slug],
    queryFn: () => api.files.workspaceDrive(slug),
    enabled: !!slug,
  });
}

export function useCreateMember() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: (data: CreateMemberInput) => api.members.create(slug, data),
    onSuccess: () => { invalidateQueries(queryKeys.members.all); },
  });
}

export function useCreateTask() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => api.tasks.create(slug, data),
    onSuccess: () => { invalidateQueries(['tasks']); },
  });
}

export function useCreateProject() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: (data: Partial<CreateProjectInput>) => api.projects.create(slug, data),
    onSuccess: () => { invalidateQueries(queryKeys.projects.all); },
  });
}

export function useUpdateProject() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UpdateProjectInput> }) =>
      api.projects.update(slug, id, data),
    onSuccess: () => { invalidateQueries(queryKeys.projects.all); },
  });
}

export function useCreateFile() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ category, ownerId, dir, body }: {
      category: string; ownerId: string; dir: string;
      body: { name: string; extension?: string; content?: string };
    }) => api.files.createFile(slug, category, ownerId, dir, body),
    onSuccess: () => { invalidateQueries(['files']); },
  });
}

export function useCreateFolder() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ category, ownerId, dir, body }: {
      category: string; ownerId: string; dir: string;
      body: { name: string };
    }) => api.files.createFolder(slug, category, ownerId, dir, body),
    onSuccess: () => { invalidateQueries(['files']); },
  });
}

export function useRenameItem() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ category, ownerId, path, body }: {
      category: string; ownerId: string; path: string;
      body: { newName: string };
    }) => api.files.renameItem(slug, category, ownerId, path, body),
    onSuccess: () => { invalidateQueries(['files']); },
  });
}

export function useDeleteItem() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ category, ownerId, path }: {
      category: string; ownerId: string; path: string;
    }) => api.files.deleteItem(slug, category, ownerId, path),
    onSuccess: () => { invalidateQueries(['files']); },
  });
}

export function useUpdateFileContent() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ category, ownerId, path, body }: {
      category: string; ownerId: string; path: string;
      body: { content: string };
    }) => api.files.updateContent(slug, category, ownerId, path, body),
    onSuccess: () => { invalidateQueries(['files']); },
  });
}

export function useMoveTask() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.tasks.move(slug, id, status),
    onSuccess: () => { invalidateQueries(['tasks']); },
  });
}

export function useSendMessage() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ conversationId, content, references }: {
      conversationId: string;
      content: string;
      references?: MessageReference[];
    }) => api.conversations.sendMessage(slug, conversationId, content, references),
    onSuccess: (_, { conversationId }) => {
      invalidateQueries(queryKeys.conversations.detail(conversationId));
    },
  });
}

export function useCreateConversation() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: (data: { participantIds: string[]; title?: string }) =>
      api.conversations.create(slug, data),
    onSuccess: () => { invalidateQueries(queryKeys.conversations.all); },
  });
}

export function useRenameConversation() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.conversations.rename(slug, id, title),
    onSuccess: () => { invalidateQueries(queryKeys.conversations.all); },
  });
}

export function useSetReaction() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ conversationId, messageId, emoji, reacted }: {
      conversationId: string;
      messageId: string;
      emoji: string;
      reacted: boolean;
    }) => api.conversations.setReaction(slug, conversationId, messageId, emoji, reacted),
    onSuccess: (_, { conversationId }) => {
      invalidateQueries(queryKeys.conversations.detail(conversationId));
    },
  });
}

export function useMemberRuntime(memberId: string | null) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.members.runtime(memberId ?? ''), slug],
    queryFn: () => api.members.runtime(slug, memberId!),
    enabled: !!memberId && !!slug,
    refetchInterval: RUNTIME_POLL_INTERVAL_MS,
  });
}

export function useStartMember() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: (id: string) => api.members.start(slug, id),
    onSuccess: (_, id) => { invalidateQueries(queryKeys.members.runtime(id)); },
  });
}

export function useStopMember() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: (id: string) => api.members.stop(slug, id),
    onSuccess: (_, id) => { invalidateQueries(queryKeys.members.runtime(id)); },
  });
}

// ── Notifications ───────────────────────────────────

export function useNotifications(opts?: { enabled?: boolean }) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.notifications.all, slug],
    queryFn: () => api.notifications.list(slug),
    enabled: !!slug && opts?.enabled !== false,
  });
}

export function useNotificationCounts(opts?: { enabled?: boolean }) {
  const slug = useWorkspaceSlug();
  return useQuery({
    queryKey: [...queryKeys.notifications.counts, slug],
    queryFn: () => api.notifications.counts(slug),
    enabled: !!slug && opts?.enabled !== false,
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
  });
}

export function useMarkNotificationRead() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(slug, id),
    onSuccess: () => {
      invalidateQueries(queryKeys.notifications.all);
      invalidateQueries(queryKeys.notifications.counts);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(slug),
    onSuccess: () => {
      invalidateQueries(queryKeys.notifications.all);
      invalidateQueries(queryKeys.notifications.counts);
    },
  });
}

export function useSubmitAcceptance() {
  const slug = useWorkspaceSlug();
  return useMutation({
    mutationFn: ({ id, action, feedback }: { id: string; action: 'accept' | 'reject'; feedback?: string }) =>
      api.tasks.submitAcceptance(slug, id, action, feedback),
    onSuccess: () => { invalidateQueries(['tasks']); },
  });
}

/** Simple hash for use as cache key */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export function useRenderFile(content: string | undefined, fileName: string, enabled: boolean) {
  const slug = useWorkspaceSlug();
  const contentHash = content ? simpleHash(content) : '';
  return useQuery({
    queryKey: [...queryKeys.render.file(fileName, contentHash), slug],
    queryFn: () => api.render.file(slug, content!, fileName),
    enabled: enabled && !!content && !!slug,
    staleTime: RENDER_STALE_TIME_MS,
  });
}
