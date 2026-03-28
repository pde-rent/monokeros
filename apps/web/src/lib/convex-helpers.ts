"use client";

/**
 * Thin adapters that wrap Convex's useQuery/useMutation to match
 * our existing { data, isLoading, error } / { mutate, mutateAsync, isPending, error }
 * hook shapes. This avoids rewriting 37+ component files.
 *
 * Includes a compat layer that adds `id` (from `_id`) and `timestamp`/`createdAt`
 * (from `_creationTime`) so components can use short-form `entity.id`.
 */

import { useMemo, useState, useCallback } from "react";
import {
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
  useAction as useConvexAction,
} from "convex/react";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

// ── Compat: add legacy `id` alias from `_id` ────────────────────────────────

/**
 * Recursively adds `id` (from `_id`) and `timestamp`/`createdAt` (from `_creationTime`)
 * to Convex documents so old components that expect `entity.id` keep working.
 */
function addLegacyFields(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(addLegacyFields);
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if ("_id" in obj) {
      const patched: Record<string, unknown> = { ...obj, id: obj._id };
      // Add timestamp aliases for messages and tasks
      if ("_creationTime" in obj) {
        if (!("timestamp" in obj))
          patched.timestamp = new Date(obj._creationTime as number).toISOString();
        if (!("createdAt" in obj))
          patched.createdAt = new Date(obj._creationTime as number).toISOString();
      }
      // Recurse into nested arrays (e.g., conversation.messages)
      for (const [key, val] of Object.entries(patched)) {
        if (Array.isArray(val)) {
          patched[key] = val.map(addLegacyFields);
        }
      }
      return patched;
    }
    return obj;
  }
  return data;
}

// ── Query adapter ────────────────────────────────────────────────────────────

export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Wraps Convex useQuery to return { data, isLoading, error } matching our existing hook shape.
 * Pass `'skip'` as args to conditionally skip the query (like enabled: false).
 */
export function useQuery<F extends FunctionReference<"query">>(
  query: F,
  args: FunctionArgs<F> | "skip",
): QueryResult<any> {
  const result = useConvexQuery(query, args);
  return useMemo(
    () => ({
      data: result !== null && result !== undefined ? addLegacyFields(result) : undefined,
      isLoading: result === undefined && args !== "skip",
      error: null, // Convex throws on errors, doesn't return them
    }),
    [result, args],
  );
}

// ── Mutation / Action shared adapter ─────────────────────────────────────────

export interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables, callbacks?: { onSuccess?: (data: TData) => void }) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  error: Error | null;
  data: TData | undefined;
}

function useAsyncMutation<TData, TVariables>(
  execute: (variables: TVariables) => Promise<TData>,
  onSuccess?: (data: TData) => void,
): MutationResult<TData, TVariables> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData>();

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await execute(variables);
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [execute, onSuccess],
  );

  const mutate = useCallback(
    (variables: TVariables, callbacks?: { onSuccess?: (data: TData) => void }) => {
      mutateAsync(variables)
        .then((d) => callbacks?.onSuccess?.(d))
        .catch(() => {});
    },
    [mutateAsync],
  );

  return { mutate, mutateAsync, isPending, error, data };
}

export function useMutation<F extends FunctionReference<"mutation">>(
  mutation: F,
  opts?: { onSuccess?: (data: FunctionReturnType<F>) => void },
): MutationResult<FunctionReturnType<F>, FunctionArgs<F>> {
  return useAsyncMutation(useConvexMutation(mutation), opts?.onSuccess);
}

export function useAction<F extends FunctionReference<"action">>(
  action: F,
  opts?: { onSuccess?: (data: FunctionReturnType<F>) => void },
): MutationResult<FunctionReturnType<F>, FunctionArgs<F>> {
  return useAsyncMutation(useConvexAction(action), opts?.onSuccess);
}
