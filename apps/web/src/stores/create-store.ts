'use client';

import { useSyncExternalStore, useMemo } from 'react';

type StoreApi<S, A> = {
  getSnapshot: () => S;
  subscribe: (listener: () => void) => () => void;
  setState: (partial: Partial<S>) => void;
  actions: A;
};

export function createStore<S extends object, A extends object>(
  initialState: S,
  actionsFactory: (setState: (partial: Partial<S>) => void, getState: () => S) => A,
): StoreApi<S, A> {
  let state = initialState;
  const listeners = new Set<() => void>();

  function emit() { listeners.forEach((l) => l()); }
  function getSnapshot() { return state; }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }
  function setState(partial: Partial<S>) {
    state = { ...state, ...partial };
    emit();
  }

  const actions = actionsFactory(setState, getSnapshot);
  return { getSnapshot, subscribe, setState, actions };
}

export function createStoreHook<S extends object, A extends object>(store: StoreApi<S, A>) {
  type Combined = S & A;

  function useStore(): Combined;
  function useStore<T>(selector: (s: Combined) => T): T;
  function useStore<T>(selector?: (s: Combined) => T) {
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const combined = useMemo(() => ({ ...state, ...store.actions }) as Combined, [state]);
    return selector ? selector(combined) : combined;
  }

  useStore.getState = (): Combined => ({ ...store.getSnapshot(), ...store.actions }) as Combined;
  useStore.setState = (partial: Partial<S>) => store.setState(partial);

  return useStore;
}
