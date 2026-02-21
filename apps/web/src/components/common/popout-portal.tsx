'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePopout, type PopoutOptions } from '@/hooks/use-popout';

interface PopoutPortalProps extends Omit<PopoutOptions, 'content' | 'path'> {
  /** Whether the popout is currently open */
  open: boolean;
  /** Called when the popout is closed (by user or programmatically) */
  onClose?: () => void;
  /** Content to render in the popout */
  children: React.ReactNode;
}

/**
 * Renders children into a popout window via React portal.
 * Automatically uses Document PiP on Chromium or falls back to window.open().
 *
 * @example
 * ```tsx
 * const [showPopout, setShowPopout] = useState(false);
 *
 * <PopoutPortal open={showPopout} onClose={() => setShowPopout(false)}>
 *   <ChatPanel conversationId="123" />
 * </PopoutPortal>
 *
 * <button onClick={() => setShowPopout(true)}>Pop out</button>
 * ```
 */
export function PopoutPortal({ open, onClose, children, ...options }: PopoutPortalProps) {
  const { openPopout, close, pipWindow, isOpen } = usePopout();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const optionsRef = useRef(options);

  // Keep refs updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    optionsRef.current = options;
  });

  // Handle open/close changes
  useEffect(() => {
    if (open && !isOpen) {
      openPopout({
        ...optionsRef.current,
        content: children,
      }).then((result) => {
        if (result.window) {
          // Create a container div for React to render into
          const div = result.window.document.createElement('div');
          div.id = 'popout-root';
          div.style.width = '100%';
          div.style.height = '100%';
          result.window.document.body.appendChild(div);
          setContainer(div);
        }
      });
    } else if (!open && isOpen) {
      close();
      setContainer(null);
    }
  }, [open, isOpen, openPopout, close]);

  // Handle popout being closed by user
  useEffect(() => {
    if (!isOpen && container) {
      setContainer(null);
      onCloseRef.current?.();
    }
  }, [isOpen, container]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isOpen) {
        close();
      }
    };
  }, [isOpen, close]);

  if (!container || !pipWindow) {
    return null;
  }

  return createPortal(children, container);
}

/**
 * Hook-based alternative to PopoutPortal for more control.
 * Returns controls and a render function.
 *
 * @example
 * ```tsx
 * const popout = usePopoutPortal();
 *
 * <button onClick={() => popout.open()}>Pop out</button>
 *
 * {popout.isOpen && popout.render(
 *   <ChatPanel conversationId="123" />
 * )}
 * ```
 */
export function usePopoutPortal(options?: Omit<PopoutOptions, 'content' | 'path'>) {
  const { openPopout, close, pipWindow, isOpen } = usePopout();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const open = useCallback(async () => {
    if (isOpen) return;

    const result = await openPopout({
      ...optionsRef.current,
      content: null,
    });

    if (result.window) {
      const div = result.window.document.createElement('div');
      div.id = 'popout-root';
      div.style.width = '100%';
      div.style.height = '100%';
      result.window.document.body.appendChild(div);
      setContainer(div);
    }
  }, [isOpen, openPopout]);

  const closePopout = useCallback(() => {
    close();
    setContainer(null);
  }, [close]);

  const render = useCallback(
    (children: React.ReactNode) => {
      if (!container || !pipWindow) return null;
      return createPortal(children, container);
    },
    [container, pipWindow]
  );

  return {
    isOpen,
    open,
    close: closePopout,
    render,
    /** Direct access to the popout window */
    window: pipWindow,
  };
}
