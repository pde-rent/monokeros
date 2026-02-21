'use client';

import { createStore, createStoreHook } from './create-store';

type WindowBehavior = 'in-app' | 'pop-out';

interface SettingsState {
  // Window behavior preferences
  chatWindowBehavior: WindowBehavior;
  filesWindowBehavior: WindowBehavior;
  orgWindowBehavior: WindowBehavior;
  projectsWindowBehavior: WindowBehavior;
  docsWindowBehavior: WindowBehavior;
  // Dialog state
  settingsDialogOpen: boolean;
}

interface SettingsActions {
  setChatWindowBehavior: (behavior: WindowBehavior) => void;
  setFilesWindowBehavior: (behavior: WindowBehavior) => void;
  setOrgWindowBehavior: (behavior: WindowBehavior) => void;
  setProjectsWindowBehavior: (behavior: WindowBehavior) => void;
  setDocsWindowBehavior: (behavior: WindowBehavior) => void;
  openSettingsDialog: () => void;
  closeSettingsDialog: () => void;
}

const STORAGE_KEY = 'monokeros-settings';

function loadSettings(): Partial<SettingsState> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return {};
}

const store = createStore<SettingsState, SettingsActions>(
  {
    chatWindowBehavior: 'in-app',
    filesWindowBehavior: 'in-app',
    orgWindowBehavior: 'in-app',
    projectsWindowBehavior: 'in-app',
    docsWindowBehavior: 'pop-out',
    settingsDialogOpen: false,
    ...loadSettings(),
  },
  (setState, _getState) => ({
    setChatWindowBehavior: (behavior) => {
      setState({ chatWindowBehavior: behavior });
      if (typeof window !== 'undefined') {
        const current = loadSettings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, chatWindowBehavior: behavior }));
      }
    },
    setFilesWindowBehavior: (behavior) => {
      setState({ filesWindowBehavior: behavior });
      if (typeof window !== 'undefined') {
        const current = loadSettings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, filesWindowBehavior: behavior }));
      }
    },
    setOrgWindowBehavior: (behavior) => {
      setState({ orgWindowBehavior: behavior });
      if (typeof window !== 'undefined') {
        const current = loadSettings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, orgWindowBehavior: behavior }));
      }
    },
    setProjectsWindowBehavior: (behavior) => {
      setState({ projectsWindowBehavior: behavior });
      if (typeof window !== 'undefined') {
        const current = loadSettings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, projectsWindowBehavior: behavior }));
      }
    },
    setDocsWindowBehavior: (behavior) => {
      setState({ docsWindowBehavior: behavior });
      if (typeof window !== 'undefined') {
        const current = loadSettings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, docsWindowBehavior: behavior }));
      }
    },
    openSettingsDialog: () => setState({ settingsDialogOpen: true }),
    closeSettingsDialog: () => setState({ settingsDialogOpen: false }),
  }),
);

export const useSettingsStore = createStoreHook(store);
export type { WindowBehavior };
