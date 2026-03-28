"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type ComponentType,
  type DependencyList,
} from "react";

export type FabAction = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  onClick: () => void;
};

export type FabConfig = {
  actions: FabAction[];
  tooltip: string;
} | null;

interface FabContextValue {
  config: FabConfig;
  setConfig: (config: FabConfig) => void;
}

const FabContext = createContext<FabContextValue>({
  config: null,
  setConfig: () => {},
});

export function FabProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<FabConfig>(null);
  return <FabContext.Provider value={{ config, setConfig }}>{children}</FabContext.Provider>;
}

export function useRegisterFab(factory: () => FabConfig, deps: DependencyList) {
  const { setConfig } = useContext(FabContext);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const config = useMemo(factory, deps);
  useEffect(() => {
    setConfig(config);
    return () => setConfig(null);
  }, [config, setConfig]);
}

export function useFabConfig() {
  return useContext(FabContext).config;
}
