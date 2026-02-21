'use client';

import { useEffect, useRef } from 'react';
import { WS_EVENTS } from '@monokeros/types';
import type { Notification } from '@monokeros/types';
import { API_PORT } from '@monokeros/constants';
import { useNotificationStore } from '@/stores/notification-store';
import { useAuthStore } from '@/stores/auth-store';
import { invalidateQueries } from '@/lib/query';
import { queryKeys } from '@/lib/query-keys';

/**
 * Connects to the API WebSocket and listens for notification events,
 * adding new notifications to the store and invalidating counts.
 */
export function useNotificationSocket() {
  const { addNotification } = useNotificationStore();
  const { user, isAuthenticated } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const ws = new WebSocket(`ws://localhost:${API_PORT}`);
    wsRef.current = ws;

    ws.addEventListener('message', (event) => {
      let parsed: { event: string; data: Record<string, unknown> };
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }

      if (parsed.event === WS_EVENTS.notification.created) {
        const notification = parsed.data.notification as Notification;
        // Only add if this notification is for the current user
        if (notification.recipientId === userRef.current?.id) {
          addNotificationRef.current(notification);
          invalidateQueries(queryKeys.notifications.counts);
        }
      }
    });

    ws.addEventListener('close', () => {
      wsRef.current = null;
    });

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [isAuthenticated, user?.id]);
}
