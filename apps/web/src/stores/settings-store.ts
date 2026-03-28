"use client";

import { createStore, createStoreHook } from "./create-store";

type WindowBehavior = "in-app" | "pop-out";
type BehaviorField =
  | "chatWindowBehavior"
  | "filesWindowBehavior"
  | "orgWindowBehavior"
  | "projectsWindowBehavior"
  | "docsWindowBehavior"
  | "boxesWindowBehavior";

interface SettingsState {
  chatWindowBehavior: WindowBehavior;
  filesWindowBehavior: WindowBehavior;
  orgWindowBehavior: WindowBehavior;
  projectsWindowBehavior: WindowBehavior;
  docsWindowBehavior: WindowBehavior;
  boxesWindowBehavior: WindowBehavior;
  settingsDialogOpen: boolean;
  settingsTab: "general" | "members";
}

interface SettingsActions {
  setWindowBehavior: (field: BehaviorField, behavior: WindowBehavior) => void;
  openSettingsDialog: (tab?: "general" | "members") => void;
  closeSettingsDialog: () => void;
}

const STORAGE_KEY = "monokeros-settings";

function loadSettings(): Partial<SettingsState> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return {};
}

function persistSetting(field: BehaviorField, value: WindowBehavior) {
  if (typeof window === "undefined") return;
  const current = loadSettings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, [field]: value }));
}

const store = createStore<SettingsState, SettingsActions>(
  {
    chatWindowBehavior: "in-app",
    filesWindowBehavior: "in-app",
    orgWindowBehavior: "in-app",
    projectsWindowBehavior: "in-app",
    docsWindowBehavior: "pop-out",
    boxesWindowBehavior: "in-app",
    settingsDialogOpen: false,
    settingsTab: "general",
    ...loadSettings(),
  },
  (setState) => ({
    setWindowBehavior: (field: BehaviorField, behavior: WindowBehavior) => {
      setState({ [field]: behavior });
      persistSetting(field, behavior);
    },
    openSettingsDialog: (tab?: "general" | "members") =>
      setState({ settingsDialogOpen: true, settingsTab: tab ?? "general" }),
    closeSettingsDialog: () =>
      setState({ settingsDialogOpen: false, settingsTab: "general" }),
  }),
);

export const useSettingsStore = createStoreHook(store);
export type { WindowBehavior, BehaviorField };
