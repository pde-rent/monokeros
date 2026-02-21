'use client';

import { API_BASE } from '@/lib/api-client';
import { LOGIN_TIMEOUT_MS, INIT_TIMEOUT_MS } from '@monokeros/constants';
import { createStore, createStoreHook } from './create-store';
import { useWorkspaceStore } from './workspace-store';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

const store = createStore<AuthState, AuthActions>(
  { user: null, token: null, role: null, isAuthenticated: false },
  (setState) => ({
    login: async (email, password) => {
      let res: Response;
      try {
        res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
        });
      } catch (err) {
        // Handle network errors
        if (err instanceof Error && err.name === 'TimeoutError') {
          throw new Error('Request timed out. Please try again.');
        }
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          throw new Error('Unable to connect to server. Please check your connection.');
        }
        throw err;
      }

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Login failed' }));

        // Handle rate limiting (429)
        if (res.status === 429) {
          const retryAfter = error.retryAfter ? Math.ceil(error.retryAfter / 60) : 15;
          throw new Error(`Too many attempts. Try again in ${retryAfter} minutes.`);
        }

        // Handle auth errors (401)
        if (res.status === 401) {
          throw new Error('Invalid email or password');
        }

        throw new Error(error.message || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      setState({ user: data.user, token: data.token, role: data.role, isAuthenticated: true });
      if (data.workspaces) useWorkspaceStore.setState({ workspaces: data.workspaces });
    },
    logout: () => {
      localStorage.removeItem('token');
      setState({ user: null, token: null, role: null, isAuthenticated: false });
    },
    initialize: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(INIT_TIMEOUT_MS),
        });
        if (!res.ok) { localStorage.removeItem('token'); return; }
        const data = await res.json();
        setState({ user: data.user, token, role: data.role, isAuthenticated: true });
        if (data.workspaces) useWorkspaceStore.setState({ workspaces: data.workspaces });
      } catch { localStorage.removeItem('token'); }
    },
  }),
);

export const useAuthStore = createStoreHook(store);
