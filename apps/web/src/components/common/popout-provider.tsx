"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePopout, type PopoutOptions } from "@/hooks/use-popout";

interface PopoutContextValue {
  /** Open content in a PiP / fallback window */
  openPopout: (content: ReactNode, options?: Omit<PopoutOptions, "content" | "path">) => void;
  /** Close the popout window */
  closePopout: () => void;
  /** Whether a popout is currently open */
  isOpen: boolean;
}

const PopoutContext = createContext<PopoutContextValue | null>(null);

export function usePopoutContext() {
  const ctx = useContext(PopoutContext);
  if (!ctx) throw new Error("usePopoutContext must be used within <PopoutProvider>");
  return ctx;
}

/**
 * Provider that manages a single popout (PiP or fallback) window.
 * Lives at the dashboard layout level so it persists across route navigations.
 */
export function PopoutProvider({ children }: { children: ReactNode }) {
  const { openPopout: rawOpen, close, isOpen } = usePopout();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [popoutContent, setPopoutContent] = useState<ReactNode>(null);
  const contentRef = useRef<ReactNode>(null);

  const openPopout = useCallback(
    (content: ReactNode, options?: Omit<PopoutOptions, "content" | "path">) => {
      contentRef.current = content;
      setPopoutContent(content);
      rawOpen({ ...options }).then((result) => {
        if (result.window) {
          const div = result.window.document.createElement("div");
          div.id = "popout-root";
          div.style.width = "100%";
          div.style.height = "100%";
          result.window.document.body.appendChild(div);
          setContainer(div);
        }
      });
    },
    [rawOpen],
  );

  const closePopout = useCallback(() => {
    close();
    setContainer(null);
    setPopoutContent(null);
    contentRef.current = null;
  }, [close]);

  // Sync: if user closes PiP window directly, clean up React state
  useEffect(() => {
    if (!isOpen && container) {
      setContainer(null);
      setPopoutContent(null);
      contentRef.current = null;
    }
  }, [isOpen, container]);

  return (
    <PopoutContext.Provider value={{ openPopout, closePopout, isOpen }}>
      {children}
      {container && popoutContent && createPortal(popoutContent, container)}
    </PopoutContext.Provider>
  );
}
