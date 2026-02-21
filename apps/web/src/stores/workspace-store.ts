'use client';

import { createStore, createStoreHook } from './create-store';

export interface WorkspaceInfo {
  id: string;
  slug: string;
  displayName: string;
  role: string;
  branding: { logo: string | null; color: string };
  industry: string;
}

interface WorkspaceState {
  workspaces: WorkspaceInfo[];
}

interface WorkspaceActions {
  setWorkspaces: (list: WorkspaceInfo[]) => void;
  addWorkspace: (ws: WorkspaceInfo) => void;
  removeWorkspace: (id: string) => void;
  updateWorkspace: (id: string, data: Partial<WorkspaceInfo>) => void;
}

const store = createStore<WorkspaceState, WorkspaceActions>(
  { workspaces: [] },
  (setState, getState) => ({
    setWorkspaces: (list) => setState({ workspaces: list }),
    addWorkspace: (ws) => setState({ workspaces: [...getState().workspaces, ws] }),
    removeWorkspace: (id) => setState({ workspaces: getState().workspaces.filter((w) => w.id !== id) }),
    updateWorkspace: (id, data) => setState({
      workspaces: getState().workspaces.map((w) => w.id === id ? { ...w, ...data } : w),
    }),
  }),
);

export const useWorkspaceStore = createStoreHook(store);
