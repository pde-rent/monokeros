"use client";

import { DiagramViewMode } from "@monokeros/types";
import { createStore, createStoreHook } from "./create-store";

type OrgDisplayMode = "diagram" | "table";

interface DiagramState {
  viewMode: DiagramViewMode;
  displayMode: OrgDisplayMode;
  selectedNodeId: string | null;
  highlightedNodeId: string | null;
  teamFilter: string[];
  statusFilter: string[];
  projectFilter: string | null;
  filterPanelOpen: boolean;
  search: string;
}

interface DiagramActions {
  setViewMode: (mode: DiagramViewMode) => void;
  setDisplayMode: (mode: OrgDisplayMode) => void;
  setSelectedNode: (id: string | null) => void;
  setHighlightedNode: (id: string | null) => void;
  setTeamFilter: (teams: string[]) => void;
  setStatusFilter: (statuses: string[]) => void;
  setProjectFilter: (projectId: string | null) => void;
  toggleFilterPanel: () => void;
  setSearch: (search: string) => void;
}

const store = createStore<DiagramState, DiagramActions>(
  {
    viewMode: DiagramViewMode.WORKFORCE,
    displayMode: "diagram",
    selectedNodeId: null,
    highlightedNodeId: null,
    teamFilter: [],
    statusFilter: [],
    projectFilter: null,
    filterPanelOpen: true,
    search: "",
  },
  (setState, getState) => ({
    setViewMode: (mode) => setState({ viewMode: mode }),
    setDisplayMode: (mode) => setState({ displayMode: mode }),
    setSelectedNode: (id) => setState({ selectedNodeId: id }),
    setHighlightedNode: (id) => setState({ highlightedNodeId: id }),
    setTeamFilter: (teams) => setState({ teamFilter: teams }),
    setStatusFilter: (statuses) => setState({ statusFilter: statuses }),
    setProjectFilter: (projectId) => setState({ projectFilter: projectId }),
    toggleFilterPanel: () => setState({ filterPanelOpen: !getState().filterPanelOpen }),
    setSearch: (search) => setState({ search }),
  }),
);

export const useDiagramStore = createStoreHook(store);
