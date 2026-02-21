'use client';

import { useCallback, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

export interface PopoutOptions {
  /** URL path to navigate to (for fallback window.open). Mutually exclusive with content. */
  path?: string;
  /** Content to render in the popout (for Document PiP). Mutually exclusive with path. */
  content?: React.ReactNode | ((close: () => void) => React.ReactNode);
  /** Dimensions for the popout window */
  width?: number;
  height?: number;
  /** Title for the popout window */
  title?: string;
  /** Force fallback mode (skip Document PiP, useful for testing) */
  forceFallback?: boolean;
}

interface PopoutResult {
  /** Whether using Document PiP (Chromium) or fallback headless window */
  isPip: boolean;
  /** Close the popout window */
  close: () => void;
  /** The window reference (for fallback mode) */
  window: Window | null;
}

/** Check if Document Picture-in-Picture API is available */
function isDocumentPiPSupported(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

/**
 * Hook for opening content in a popout window.
 *
 * Uses the Document Picture-in-Picture API on Chromium browsers for a
 * minimal, always-on-top window. Falls back to window.open() for Firefox/Safari.
 *
 * @example
 * ```tsx
 * const { openPopout, closePopout, isPipOpen } = usePopout();
 *
 * <button onClick={() => openPopout({ content: <ChatPanel /> })}>
 *   Pop out chat
 * </button>
 * ```
 */
export function usePopout() {
  const params = useParams<{ workspace: string }>();
  const pipWindowRef = useRef<Window | null>(null);
  const fallbackWindowRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  /** Close any open popout window */
  const close = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
    if (fallbackWindowRef.current) {
      fallbackWindowRef.current.close();
      fallbackWindowRef.current = null;
    }
    setIsOpen(false);
  }, []);

  /** Copy styles from parent document to popout window */
  const copyStyles = useCallback((targetWindow: Window) => {
    // Copy linked stylesheets
    [...document.styleSheets].forEach((styleSheet) => {
      try {
        // Try to get the href for linked stylesheets
        if (styleSheet.href) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          targetWindow.document.head.appendChild(link);
        } else if (styleSheet.cssRules) {
          // Inline styles: create a style element with the rules
          const style = document.createElement('style');
          [...styleSheet.cssRules].forEach((rule) => {
            style.appendChild(document.createTextNode(rule.cssText));
          });
          targetWindow.document.head.appendChild(style);
        }
      } catch {
        // CORS may block access to cssRules from external stylesheets
        // In that case, just link the stylesheet if href is available
        if (styleSheet.href) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          targetWindow.document.head.appendChild(link);
        }
      }
    });
  }, []);

  /** Open using Document Picture-in-Picture API (Chromium) */
  const openPiP = useCallback(async (options: PopoutOptions): Promise<PopoutResult> => {
    const { width = 400, height = 500, title } = options;

    // Request the PiP window
    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width,
      height,
    });

    pipWindowRef.current = pipWindow;

    // Copy styles and theme from parent
    copyStyles(pipWindow);
    pipWindow.document.documentElement.className = document.documentElement.className;

    // Set up basic document structure
    pipWindow.document.body.style.margin = '0';
    pipWindow.document.body.style.padding = '0';
    pipWindow.document.body.style.overflow = 'hidden';
    pipWindow.document.body.style.backgroundColor = 'var(--color-canvas, #1a1a2e)';

    if (title) pipWindow.document.title = title;

    // Handle window close
    pipWindow.addEventListener('pagehide', () => {
      pipWindowRef.current = null;
      setIsOpen(false);
    });

    setIsOpen(true);

    // Return control to caller for React rendering
    return { isPip: true, close, window: pipWindow };
  }, [close, copyStyles]);

  /** Open using traditional window.open() (Firefox/Safari fallback) */
  const openFallback = useCallback((options: PopoutOptions): PopoutResult => {
    const { path, width = 800, height = 600, title = 'MonokerOS' } = options;
    const workspace = params.workspace || '';

    // Calculate center position
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Determine URL: use provided path or about:blank for content mode
    const url = path ? `/${workspace}${path}` : 'about:blank';

    // Open as a popup window
    const popup = window.open(
      url,
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    );

    if (!popup) {
      console.warn('Popout blocked. Please allow popups for this site.');
      return { isPip: false, close, window: null };
    }

    fallbackWindowRef.current = popup;

    // Only set up document if we're in content mode (not URL mode)
    if (!path) {
      // Copy styles and theme from parent
      copyStyles(popup);
      popup.document.documentElement.className = document.documentElement.className;

      // Set up basic document structure
      popup.document.body.style.margin = '0';
      popup.document.body.style.padding = '0';
      popup.document.body.style.overflow = 'hidden';
      popup.document.title = title;
    }

    // Handle window close
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      if (popup.closed) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        fallbackWindowRef.current = null;
        setIsOpen(false);
      }
    }, 500);

    setIsOpen(true);

    // Return null window for URL mode (caller can't render into it)
    return { isPip: false, close, window: path ? null : popup };
  }, [close, copyStyles, params.workspace]);

  /** Open a popout window with the given options */
  const openPopout = useCallback(async (options: PopoutOptions): Promise<PopoutResult> => {
    // Close any existing popout first
    close();

    const { forceFallback = false, path } = options;

    // URL mode: always use fallback (Document PiP can't navigate to URLs)
    if (path) {
      return openFallback(options);
    }

    // Content mode: use Document PiP if supported and not forcing fallback
    if (!forceFallback && isDocumentPiPSupported()) {
      try {
        return await openPiP(options);
      } catch (err) {
        console.warn('Document PiP failed, falling back to window.open:', err);
        return openFallback(options);
      }
    }

    return openFallback(options);
  }, [close, openPiP, openFallback]);

  return {
    openPopout,
    close,
    isOpen,
    /** Whether Document PiP is supported in this browser */
    isPiPSupported: isDocumentPiPSupported(),
    /** Reference to the current popout window (for advanced use) */
    pipWindow: pipWindowRef.current || fallbackWindowRef.current,
  };
}
