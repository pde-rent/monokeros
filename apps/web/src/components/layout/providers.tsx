'use client';

import { type ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationSocket } from '@/hooks/use-notification-socket';
import { WindowProvider } from '@monokeros/ui';

export function Providers({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useNotificationSocket();

  return (
    <WindowProvider>
      {children}
    </WindowProvider>
  );
}
