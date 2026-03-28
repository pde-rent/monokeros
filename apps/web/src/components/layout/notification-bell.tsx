"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BellIcon, CheckIcon } from "@phosphor-icons/react";
import { useConvexAuth } from "convex/react";
import {
  useNotifications,
  useNotificationCounts,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-queries";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { formatRelativeTime } from "@monokeros/utils";
import { Button, useClickOutside } from "@monokeros/ui";
import type { Id } from "../../../convex/_generated/dataModel";

export function NotificationBell() {
  const { isAuthenticated } = useConvexAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const workspaceId = useWorkspaceId();

  const { data: notifications } = useNotifications({ enabled: isAuthenticated });
  const { data: counts } = useNotificationCounts({ enabled: isAuthenticated });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const panelRef = useRef<HTMLDivElement>(null);

  const unreadTotal = counts?.total ?? 0;
  const notificationList = notifications ?? [];

  const closePanel = useCallback(() => setPanelOpen(false), []);
  useClickOutside(panelRef, closePanel, panelOpen);
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanelOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  if (!isAuthenticated) return null;

  return (
    <div ref={panelRef} className="relative flex items-stretch">
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        onClick={() => setPanelOpen((o) => !o)}
        title="Notifications"
        className="text-fg-3 hover:text-fg-2"
        icon={
          <span className="relative">
            <BellIcon size={14} />
            {unreadTotal > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-sm bg-blue-bg px-0.5 text-[8px] font-bold text-white">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </span>
        }
      />

      {panelOpen && (
        <div className="absolute right-0 top-full z-50 mt-0.5 w-80 rounded-md border border-edge bg-surface shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-edge px-3 py-2">
            <span className="text-xs font-semibold text-fg">Notifications</span>
            {unreadTotal > 0 && (
              <button
                onClick={() => workspaceId && markAllRead.mutate({ workspaceId })}
                className="flex items-center gap-1 text-[10px] text-blue hover:text-blue-light"
              >
                <CheckIcon size={10} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notificationList.length === 0 ? (
              <div className="px-3 py-6 text-center text-[10px] text-fg-3">
                No notifications yet
              </div>
            ) : (
              notificationList.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read && workspaceId)
                      markRead.mutate({ workspaceId, notificationId: n.id as Id<"notifications"> });
                  }}
                  className={`flex w-full gap-2.5 border-b border-edge px-3 py-2 text-left transition-colors hover:bg-surface-2 ${
                    !n.read ? "bg-surface-2/50" : ""
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1 shrink-0">
                    {!n.read ? (
                      <span className="block h-1.5 w-1.5 rounded-sm bg-blue" />
                    ) : (
                      <span className="block h-1.5 w-1.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-fg leading-tight">{n.title}</div>
                    <div className="mt-0.5 truncate text-[9px] text-fg-2 leading-tight">
                      {n.body}
                    </div>
                    <div className="mt-0.5 text-[8px] text-fg-3">
                      {formatRelativeTime(n.createdAt as string)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
