'use client';

import { createContext, useContext, useState, useEffect, type ReactNode, type ComponentType } from 'react';

export type FabAction = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; weight?: string }>;
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
  return (
    <FabContext.Provider value={{ config, setConfig }}>
      {children}
    </FabContext.Provider>
  );
}

export function useRegisterFab(config: FabConfig) {
  const { setConfig } = useContext(FabContext);
  useEffect(() => {
    setConfig(config);
    return () => setConfig(null);
  }, [config, setConfig]);
}

export function useFabConfig() {
  return useContext(FabContext).config;
}
