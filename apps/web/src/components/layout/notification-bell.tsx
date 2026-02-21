'use client';

import { useEffect, useRef } from 'react';
import { BellIcon, CheckIcon } from '@phosphor-icons/react';
import { useNotificationStore } from '@/stores/notification-store';
import { useNotifications, useNotificationCounts, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-queries';
import { useAuthStore } from '@/stores/auth-store';
import { formatRelativeTime } from '@monokeros/utils';
import { Button } from '@monokeros/ui';

export function NotificationBell() {
  const { isAuthenticated } = useAuthStore();
  const {
    panelOpen,
    togglePanel,
    closePanel,
    setNotifications,
    setUnreadCounts,
  } = useNotificationStore();
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCounts = useNotificationStore((s) => s.unreadCounts);

  const { data: fetchedNotifications } = useNotifications({ enabled: isAuthenticated });
  const { data: fetchedCounts } = useNotificationCounts({ enabled: isAuthenticated });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const panelRef = useRef<HTMLDivElement>(null);

  // Sync fetched data to store
  useEffect(() => {
    if (fetchedNotifications) setNotifications(fetchedNotifications);
  }, [fetchedNotifications, setNotifications]);

  useEffect(() => {
    if (fetchedCounts) setUnreadCounts(fetchedCounts);
  }, [fetchedCounts, setUnreadCounts]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!panelOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [panelOpen, closePanel]);

  if (!isAuthenticated) return null;

  return (
    <div ref={panelRef} className="relative flex items-stretch">
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        onClick={togglePanel}
        title="Notifications"
        icon={
          <span className="relative">
            <BellIcon size={14} />
            {unreadCounts.total > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-sm bg-blue-bg px-0.5 text-[8px] font-bold text-white">
                {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
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
            {unreadCounts.total > 0 && (
              <button
                onClick={() => markAllRead.mutate(undefined)}
                className="flex items-center gap-1 text-[10px] text-blue hover:text-blue-light"
              >
                <CheckIcon size={10} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center text-[10px] text-fg-3">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markRead.mutate(n.id);
                  }}
                  className={`flex w-full gap-2.5 border-b border-edge px-3 py-2 text-left transition-colors hover:bg-surface-2 ${
                    !n.read ? 'bg-surface-2/50' : ''
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
                    <div className="text-[10px] font-medium text-fg leading-tight">
                      {n.title}
                    </div>
                    <div className="mt-0.5 truncate text-[9px] text-fg-2 leading-tight">
                      {n.body}
                    </div>
                    <div className="mt-0.5 text-[8px] text-fg-3">
                      {formatRelativeTime(n.createdAt)}
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
