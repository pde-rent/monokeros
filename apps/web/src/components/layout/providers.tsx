"use client";

import { type ReactNode } from "react";
import { WindowProvider } from "@monokeros/ui";
import { ConvexClientProvider } from "./convex-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <WindowProvider>{children}</WindowProvider>
    </ConvexClientProvider>
  );
}
