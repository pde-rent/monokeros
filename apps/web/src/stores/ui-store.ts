'use client';

import { createStore, createStoreHook } from './create-store';

type DetailPanelState = {
  type: 'agent' | 'team' | 'human' | 'project' | 'task';
  entityId: string;
} | null;

type Theme = 'light' | 'dark';

export interface DocsHeading {
  id: string;
  text: string;
  level: number;
}

export type DocsContext = {
  headings: DocsHeading[];
  activeHeading: string | null;
  onScrollTo: ((id: string) => void) | null;
  currentPath: string;
  navPages: { title: string; path: string }[];
} | null;

interface UIState {
  activeView: 'org' | 'projects' | 'chat' | 'files';
  detailPanel: DetailPanelState;
  theme: Theme;
  docsContext: DocsContext;
}

interface UIActions {
  setActiveView: (view: 'org' | 'projects' | 'chat' | 'files') => void;
  openDetailPanel: (type: 'agent' | 'team' | 'human' | 'project' | 'task', entityId: string) => void;
  closeDetailPanel: () => void;
  toggleTheme: () => void;
  setDocsContext: (ctx: DocsContext) => void;
}

const store = createStore<UIState, UIActions>(
  { activeView: 'org', detailPanel: null, theme: 'dark', docsContext: null },
  (setState, getState) => ({
    setActiveView: (view) => setState({ activeView: view }),
    openDetailPanel: (type, entityId) => setState({ detailPanel: { type, entityId } }),
    closeDetailPanel: () => setState({ detailPanel: null }),
    toggleTheme: () => {
      const next = getState().theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') localStorage.setItem('theme', next);
      setState({ theme: next });
    },
    setDocsContext: (ctx) => setState({ docsContext: ctx }),
  }),
);

export const useUIStore = createStoreHook(store);
