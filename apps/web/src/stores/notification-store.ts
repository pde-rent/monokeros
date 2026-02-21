'use client';

import type { Notification } from '@monokeros/types';
import { createStore, createStoreHook } from './create-store';

interface UnreadCounts {
  total: number;
  chat: number;
  files: number;
  org: number;
  projects: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCounts: UnreadCounts;
  panelOpen: boolean;
}

interface NotificationActions {
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setUnreadCounts: (counts: UnreadCounts) => void;
  togglePanel: () => void;
  closePanel: () => void;
}

const store = createStore<NotificationState, NotificationActions>(
  {
    notifications: [],
    unreadCounts: { total: 0, chat: 0, files: 0, org: 0, projects: 0 },
    panelOpen: false,
  },
  (setState, getState) => ({
    setNotifications: (notifications) => setState({ notifications }),
    addNotification: (notification) => {
      setState({ notifications: [notification, ...getState().notifications] });
    },
    markRead: (id) => {
      setState({
        notifications: getState().notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      });
    },
    markAllRead: () => {
      setState({
        notifications: getState().notifications.map((n) => ({ ...n, read: true })),
        unreadCounts: { total: 0, chat: 0, files: 0, org: 0, projects: 0 },
      });
    },
    setUnreadCounts: (counts) => setState({ unreadCounts: counts }),
    togglePanel: () => setState({ panelOpen: !getState().panelOpen }),
    closePanel: () => setState({ panelOpen: false }),
  }),
);

export const useNotificationStore = createStoreHook(store);
