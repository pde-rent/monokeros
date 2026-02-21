'use client';

import { useState, useEffect, useCallback, useRef, useInsertionEffect } from 'react';
import { QUERY_STALE_TIME_MS } from '@monokeros/constants';

// ── Simple cache ──────────────────────────────────────

type CacheEntry<T = unknown> = { data: T; timestamp: number };
const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<unknown>>();

function cacheKey(key: readonly unknown[]): string {
  return JSON.stringify(key);
}

function subscribe(key: string, handler: () => void) {
  let set = listeners.get(key);
  if (!set) { set = new Set(); listeners.set(key, set); }
  set.add(handler);
  return () => {
    set.delete(handler);
    if (set.size === 0) listeners.delete(key);
  };
}

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

export function invalidateQueries(keyPrefix: readonly unknown[]) {
  const prefix = JSON.stringify(keyPrefix);
  // Match exact or any key that starts with the prefix array
  for (const k of cache.keys()) {
    if (k === prefix || k.startsWith(prefix.slice(0, -1) + ',')) {
      cache.delete(k);
      notify(k);
    }
  }
}

// ── useQuery ──────────────────────────────────────────

interface UseQueryOptions<T> {
  queryKey: readonly unknown[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useQuery<T>({ queryKey, queryFn, enabled = true, staleTime = QUERY_STALE_TIME_MS, refetchInterval }: UseQueryOptions<T>): UseQueryResult<T> {
  const key = cacheKey(queryKey);
  const [state, setState] = useState<UseQueryResult<T>>(() => {
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < staleTime) {
      return { data: cached.data, isLoading: false, error: null };
    }
    return { data: undefined, isLoading: enabled, error: null };
  });
  const activeRef = useRef(0);
  const queryFnRef = useRef(queryFn);
  useInsertionEffect(() => { queryFnRef.current = queryFn; });

  const fetchData = useCallback(async () => {
    const id = ++activeRef.current;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    // Deduplicate: reuse in-flight request for the same key
    let promise = inflight.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = queryFnRef.current();
      inflight.set(key, promise);
      promise.finally(() => inflight.delete(key));
    }

    try {
      const data = await promise;
      if (id !== activeRef.current) return;
      cache.set(key, { data, timestamp: Date.now() });
      setState({ data, isLoading: false, error: null });
    } catch (err) {
      if (id !== activeRef.current) return;
      setState((s) => ({ ...s, isLoading: false, error: err instanceof Error ? err : new Error(String(err)) }));
    }
  }, [key]);

  // Subscribe to cache invalidations
  useEffect(() => {
    const handler = () => { if (enabled) fetchData(); };
    return subscribe(key, handler);
  }, [key, enabled, fetchData]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) {
      setState((s) => s.isLoading ? { ...s, isLoading: false } : s);
      return;
    }
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < staleTime) {
      setState({ data: cached.data, isLoading: false, error: null });
      return;
    }
    fetchData();
  }, [key, enabled, fetchData, staleTime]);

  // Polling
  useEffect(() => {
    if (!enabled || !refetchInterval) return;
    const id = setInterval(fetchData, refetchInterval);
    return () => clearInterval(id);
  }, [enabled, refetchInterval, fetchData]);

  return state;
}

// ── useMutation ───────────────────────────────────────

interface UseMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
}

export interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables, callbacks?: { onSuccess?: (data: TData) => void }) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  error: Error | null;
  data: TData | undefined;
}

export function useMutation<TData, TVariables>({ mutationFn, onSuccess }: UseMutationOptions<TData, TVariables>): UseMutationResult<TData, TVariables> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData>();

  const mutateAsync = useCallback(async (variables: TVariables) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await mutationFn(variables);
      setData(result);
      onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  }, [mutationFn, onSuccess]);

  const mutate = useCallback((variables: TVariables, callbacks?: { onSuccess?: (data: TData) => void }) => {
    mutateAsync(variables).then((d) => callbacks?.onSuccess?.(d)).catch(() => {});
  }, [mutateAsync]);

  return { mutate, mutateAsync, isPending, error, data };
}
