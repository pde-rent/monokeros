"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { usePopoutContext } from "./popout-provider";
import type { PopoutOptions } from "@/hooks/use-popout";

/**
 * Hook for opening content in a popout window.
 * Thin wrapper around PopoutProvider context — the provider manages the
 * portal lifecycle so content survives route navigations.
 *
 * @example
 * ```tsx
 * const popout = usePopoutPortal({ width: 700, height: 850 });
 *
 * <button onClick={() => popout.open(
 *   <div className="h-full w-full bg-surface"><MyContent /></div>
 * )}>Pop out</button>
 * ```
 */
export function usePopoutPortal(options?: Omit<PopoutOptions, "content" | "path">) {
  const { openPopout, closePopout, isOpen } = usePopoutContext();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const open = useCallback(
    (content: ReactNode) => {
      openPopout(content, optionsRef.current);
    },
    [openPopout],
  );

  return {
    isOpen,
    open,
    close: closePopout,
  };
}
