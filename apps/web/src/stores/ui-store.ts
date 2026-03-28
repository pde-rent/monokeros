"use client";

import { createStore, createStoreHook } from "./create-store";

type DetailPanelState = {
  type: "agent" | "team" | "human" | "project" | "task";
  entityId: string;
} | null;

type Theme = "light" | "dark";

interface UIState {
  detailPanel: DetailPanelState;
  theme: Theme;
}

interface UIActions {
  openDetailPanel: (
    type: "agent" | "team" | "human" | "project" | "task",
    entityId: string,
  ) => void;
  closeDetailPanel: () => void;
  toggleTheme: () => void;
}

const store = createStore<UIState, UIActions>(
  { detailPanel: null, theme: "dark" },
  (setState, getState) => ({
    openDetailPanel: (type, entityId) => setState({ detailPanel: { type, entityId } }),
    closeDetailPanel: () => setState({ detailPanel: null }),
    toggleTheme: () => {
      const next = getState().theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") localStorage.setItem("theme", next);
      setState({ theme: next });
    },
  }),
);

export const useUIStore = createStoreHook(store);
