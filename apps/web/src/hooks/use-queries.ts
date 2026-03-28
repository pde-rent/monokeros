"use client";

/**
 * Query and mutation hooks — Convex-backed.
 *
 * Uses factory helpers to eliminate boilerplate for workspace-scoped queries.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useAction, type QueryResult } from "@/lib/convex-helpers";
import { api } from "../../convex/_generated/api";
import { useWorkspaceId } from "./use-workspace";
import type { Id } from "../../convex/_generated/dataModel";
import type {
  Member,
  Team,
  Project,
  Task,
  Conversation,
  ChatMessage,
  Notification,
} from "@monokeros/types";

// ── Factory helpers ─────────────────────────────────────────────────────────

function useWsQuery<T>(
  queryFn: any,
  extraArgs?: Record<string, any>,
  opts?: { enabled?: boolean },
): QueryResult<T> {
  const wid = useWorkspaceId();
  const skip = !wid || opts?.enabled === false;
  return useQuery(queryFn, skip ? "skip" : { workspaceId: wid!, ...extraArgs });
}

function useEntityQuery<T>(
  queryFn: any,
  id: string | null,
  idField: string,
): QueryResult<T> {
  const wid = useWorkspaceId();
  return useQuery(queryFn, id && wid ? { workspaceId: wid, [idField]: id } : "skip");
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const useMembers = (opts?: { enabled?: boolean }): QueryResult<Member[]> =>
  useWsQuery(api.members.list, undefined, opts);

export const useTeams = (opts?: { enabled?: boolean }): QueryResult<Team[]> =>
  useWsQuery(api.teams.list, undefined, opts);

export const useConversations = (opts?: { enabled?: boolean }): QueryResult<Conversation[]> =>
  useWsQuery(api.conversations.list, undefined, opts);

export const useNotifications = (opts?: { enabled?: boolean }): QueryResult<Notification[]> =>
  useWsQuery(api.notifications.list, undefined, opts);

export const useDrives = (opts?: { enabled?: boolean }) =>
  useWsQuery(api.files.drives, undefined, opts);

export const useWorkspaceDrive = () => useWsQuery(api.files.workspaceDrive);

export function useProjects(
  params?: { status?: string; type?: string; search?: string },
  opts?: { enabled?: boolean },
): QueryResult<Project[]> {
  return useWsQuery(api.projects.list, params, opts);
}

export function useTasks(
  params?: { projectId?: string; status?: string },
  opts?: { enabled?: boolean },
): QueryResult<Task[]> {
  const wid = useWorkspaceId();
  const skip = !wid || opts?.enabled === false;
  return useQuery(
    api.tasks.list,
    skip
      ? "skip"
      : {
          workspaceId: wid!,
          projectId: params?.projectId as Id<"projects"> | undefined,
          status: params?.status,
        },
  );
}

export function useNotificationCounts(opts?: {
  enabled?: boolean;
}): QueryResult<{ total: number; chat: number; files: number; org: number; projects: number }> {
  return useWsQuery(api.notifications.counts, undefined, opts);
}

export function useConversation(
  id: string | null,
): QueryResult<(Conversation & { messages: ChatMessage[] }) | null> {
  return useEntityQuery(api.conversations.get, id, "conversationId");
}

export const useMemberRuntime = (memberId: string | null) =>
  useEntityQuery(api.members.getRuntime, memberId, "memberId");

export const useTeamDrive = (teamId: string | null) =>
  useEntityQuery(api.files.teamDrive, teamId, "teamId");

export const useMemberDrive = (memberId: string | null) =>
  useEntityQuery(api.files.memberDrive, memberId, "memberId");

export const useProjectDrive = (projectId: string | null) =>
  useEntityQuery(api.files.projectDrive, projectId, "projectId");

export function useTokenUsage(memberId: string | null, limit?: number) {
  return useQuery(
    api.tokenUsage.getByMember,
    memberId ? { memberId: memberId as Id<"members">, limit } : "skip",
  );
}

export function useResourceHistory(memberId: string | null, limit?: number) {
  return useQuery(
    api.resourceSnapshots.getByMember,
    memberId ? { memberId: memberId as Id<"members">, limit } : "skip",
  );
}

// ── Mutations ────────────────────────────────────────────────────────────────

export const useCreateMember = () => useMutation(api.members.create);
export const useCreateTask = () => useMutation(api.tasks.create);
export const useCreateProject = () => useMutation(api.projects.create);
export const useUpdateProject = () => useMutation(api.projects.update);
export const useCreateFile = () => useMutation(api.files.createFile);
export const useCreateFolder = () => useMutation(api.files.createFolder);
export const useDeleteItem = () => useMutation(api.files.deleteItem);
export const useUpdateFileContent = () => useMutation(api.files.updateContent);
export const useMoveTask = () => useMutation(api.tasks.move);
export const useSendMessage = () => useMutation(api.conversations.sendMessage);
export const useCreateConversation = () => useMutation(api.conversations.create);
export const useSetReaction = () => useMutation(api.conversations.setReaction);
export const useMarkNotificationRead = () => useMutation(api.notifications.markRead);
export const useMarkAllNotificationsRead = () => useMutation(api.notifications.markAllRead);
export const useSubmitAcceptance = () => useMutation(api.tasks.submitAcceptance);
export const useStartMember = () => useAction(api.members.startContainer);
// ── Container Stats (polled via Convex action) ──────────────────────────

interface ContainerStats {
  cpuPercent: number;
  memoryMb: number;
  windows: string[];
  updatedAt: string | null;
}

export function useContainerStats(
  memberId: string | null,
  intervalMs = 10_000,
): QueryResult<ContainerStats> {
  const wid = useWorkspaceId();
  const getStats = useAction(api.members.getContainerStats);
  const [data, setData] = useState<ContainerStats | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!memberId || !wid) {
      setData(undefined);
      return;
    }

    let active = true;
    const poll = async () => {
      try {
        if (active && !data) setIsLoading(true);
        const result = await getStats.mutateAsync({
          workspaceId: wid,
          memberId: memberId as Id<"members">,
        });
        if (active) {
          setData(result as ContainerStats);
          setIsLoading(false);
        }
      } catch {
        // ignore errors during polling
      }
    };

    void poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [memberId, wid, intervalMs]);

  return { data, isLoading, error: null };
}

// ── Desktop Session (auth-gated VNC with role-based access) ──────────────

interface DesktopSession {
  wsUrl: string | null;
  isAdmin: boolean;
  viewOnly: boolean;
}

export function useDesktopSession(
  memberId: string | null,
  interactive?: boolean,
): QueryResult<DesktopSession> {
  const wid = useWorkspaceId();
  const createSession = useAction(api.members.createDesktopSession);
  const [data, setData] = useState<DesktopSession | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const renewalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchSession = useCallback(async () => {
    if (!memberId || !wid) return;
    try {
      setIsLoading((prev) => !data && prev === false ? true : prev);
      const result = await createSession.mutateAsync({
        workspaceId: wid,
        memberId: memberId as Id<"members">,
        interactive,
      });
      setData(result as DesktopSession);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  }, [memberId, wid, interactive]);

  useEffect(() => {
    if (!memberId || !wid) {
      setData(undefined);
      return;
    }

    void fetchSession();

    // Auto-renew every 4 minutes (before 5-min token expiry)
    renewalRef.current = setInterval(fetchSession, 4 * 60 * 1000);
    return () => {
      clearInterval(renewalRef.current);
    };
  }, [memberId, wid, interactive, fetchSession]);

  return { data, isLoading, error: null };
}

// ── Render (client-side markdown rendering) ─────────────────────────────────

import { renderMarkdown } from "@monokeros/renderer";

export function useRenderFile(content: string | undefined, _fileName: string, enabled: boolean) {
  const html = useMemo(() => {
    if (!enabled || !content) return undefined;
    const result = renderMarkdown(content);
    return result.html;
  }, [content, enabled]);

  return {
    data: html ? { html } : undefined,
    isLoading: false,
    error: null,
  };
}
