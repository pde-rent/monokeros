"use client";

import { GearSixIcon, UsersIcon } from "@phosphor-icons/react";
import { Dialog, Button } from "@monokeros/ui";
import { useSettingsStore, type WindowBehavior, type BehaviorField } from "@/stores/settings-store";
import { RolesView } from "../roles/roles-view";
import { useConvexAuth, useQuery as useConvexQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useParams } from "next/navigation";

const WINDOW_SETTINGS: { key: BehaviorField; label: string }[] = [
  { key: "chatWindowBehavior", label: "Chat" },
  { key: "filesWindowBehavior", label: "Files" },
  { key: "orgWindowBehavior", label: "Org" },
  { key: "projectsWindowBehavior", label: "Projects" },
  { key: "docsWindowBehavior", label: "Docs" },
  { key: "boxesWindowBehavior", label: "Boxes" },
];

export function SettingsDialog() {
  const settings = useSettingsStore();
  const {
    settingsDialogOpen,
    settingsTab,
    closeSettingsDialog,
  } = settings;

  const { isAuthenticated } = useConvexAuth();
  const currentUser = useConvexQuery(api.auth.currentUser, isAuthenticated ? {} : "skip");
  const { workspace: slug } = useParams<{ workspace: string }>();
  const role = currentUser?.workspaces?.find((ws) => ws.slug === slug)?.role ?? null;
  const isAdmin = role === "admin";

  const setTab = (tab: "general" | "members") =>
    useSettingsStore.getState().openSettingsDialog(tab);

  return (
    <Dialog
      open={settingsDialogOpen}
      onClose={closeSettingsDialog}
      title="Settings"
      icon={<GearSixIcon size={16} />}
      width={420}
    >
      {/* Tab bar */}
      <div className="mb-4 flex gap-0 border-b border-edge -mx-5 px-5">
        <button
          onClick={() => setTab("general")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            settingsTab === "general"
              ? "text-fg border-b-2 border-accent"
              : "text-fg-2 hover:text-fg"
          }`}
        >
          <GearSixIcon size={13} />
          General
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab("members")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              settingsTab === "members"
                ? "text-fg border-b-2 border-accent"
                : "text-fg-2 hover:text-fg"
            }`}
          >
            <UsersIcon size={13} />
            Members
          </button>
        )}
      </div>

      {settingsTab === "members" && isAdmin ? (
        <div className="h-[400px] -mx-5 -mb-5 overflow-hidden">
          <RolesView />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Window Behavior Section */}
          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-fg-3">
              Open views as
            </h3>
            <div className="rounded border border-edge divide-y divide-edge">
              {WINDOW_SETTINGS.map(({ key, label }) => {
                const value = settings[key] as WindowBehavior;
                const onChange = (v: WindowBehavior) => settings.setWindowBehavior(key, v);
                return (
                  <div key={key} className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs text-fg">{label}</span>
                    <div className="flex rounded border border-edge overflow-hidden text-[10px]">
                      <button
                        onClick={() => onChange("in-app")}
                        className={`px-2.5 py-1 transition-colors ${
                          value === "in-app"
                            ? "bg-accent text-white"
                            : "bg-transparent text-fg-2 hover:text-fg"
                        }`}
                      >
                        In App
                      </button>
                      <button
                        onClick={() => onChange("pop-out")}
                        className={`px-2.5 py-1 border-l border-edge transition-colors ${
                          value === "pop-out"
                            ? "bg-accent text-white"
                            : "bg-transparent text-fg-2 hover:text-fg"
                        }`}
                      >
                        Pop Out
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Done Button */}
          <div className="flex justify-end border-t border-edge pt-4">
            <Button size="sm" variant="primary" onClick={closeSettingsDialog}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
