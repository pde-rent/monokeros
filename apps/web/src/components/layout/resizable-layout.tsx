'use client';

import { ReactNode } from 'react';
import { Panel, Group, Separator, PanelImperativeHandle, Orientation } from 'react-resizable-panels';
import { useRef, useEffect, useState, useCallback } from 'react';

/** Custom vertical resize handle */
function ResizeHandle({ className = '' }: { className?: string }) {
  return (
    <Separator className={`group relative flex items-center justify-center w-px bg-edge hover:bg-blue transition-colors ${className}`}>
      <div className="absolute inset-y-0 -left-1 -right-1 z-10 cursor-col-resize" />
    </Separator>
  );
}

/** Custom horizontal resize handle */
function HorizontalResizeHandle({ className = '' }: { className?: string }) {
  return (
    <Separator className={`group relative flex items-center justify-center h-px bg-edge hover:bg-blue transition-colors ${className}`}>
      <div className="absolute -top-1 -bottom-1 -left-0 -right-0 z-10 cursor-row-resize" />
    </Separator>
  );
}

/** Storage key prefix for layout persistence */
const STORAGE_KEY_PREFIX = 'monokeros-layout-';

/** Hook to persist panel layouts to localStorage */
function useLayoutStorage(id: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${id}`;

  const loadLayout = useCallback(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : undefined;
    } catch {
      return undefined;
    }
  }, [storageKey]);

  const saveLayout = useCallback((layout: Record<string, number>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      // Ignore storage errors
    }
  }, [storageKey]);

  return { loadLayout, saveLayout };
}

interface ResizablePanelsProps {
  /** Left panel content */
  left?: ReactNode;
  /** Left panel default size (percentage) */
  leftDefaultSize?: number;
  /** Left panel min size (percentage) */
  leftMinSize?: number;
  /** Left panel max size (percentage) */
  leftMaxSize?: number;
  /** Center/main panel content */
  center: ReactNode;
  /** Right panel content */
  right?: ReactNode;
  /** Right panel default size (percentage) */
  rightDefaultSize?: number;
  /** Right panel min size (percentage) */
  rightMinSize?: number;
  /** Right panel max size (percentage) */
  rightMaxSize?: number;
  /** Whether right panel is visible */
  rightVisible?: boolean;
  /** Layout ID for persistence */
  layoutId?: string;
  /** Additional class name for container */
  className?: string;
}

/**
 * Resizable three-panel layout (left - center - right)
 */
export function ResizablePanels({
  left,
  leftDefaultSize = 20,
  leftMinSize = 15,
  leftMaxSize = 40,
  center,
  right,
  rightDefaultSize = 25,
  rightMinSize = 20,
  rightMaxSize = 40,
  rightVisible = true,
  layoutId = 'main',
  className = '',
}: ResizablePanelsProps) {
  const [panelRef, setPanelRef] = useState<PanelImperativeHandle | null>(null);
  const { loadLayout, saveLayout } = useLayoutStorage(layoutId);

  // Handle right panel visibility
  useEffect(() => {
    if (panelRef) {
      if (rightVisible && right) {
        panelRef.expand?.();
      } else if (!rightVisible || !right) {
        panelRef.collapse?.();
      }
    }
  }, [panelRef, rightVisible, right]);

  const hasLeft = Boolean(left);
  const hasRight = Boolean(right) && rightVisible;

  const defaultLayout = loadLayout();

  return (
    <Group
      orientation="horizontal"
      className={`h-full ${className}`}
      defaultLayout={defaultLayout}
      onLayoutChange={saveLayout}
    >
      {/* Left Panel */}
      {hasLeft && (
        <>
          <Panel
            id="left"
            defaultSize={leftDefaultSize}
            minSize={leftMinSize}
            maxSize={leftMaxSize}
            className="overflow-hidden"
          >
            {left}
          </Panel>
          <ResizeHandle />
        </>
      )}

      {/* Center Panel */}
      <Panel id="center" minSize={30} className="overflow-hidden">
        {center}
      </Panel>

      {/* Right Panel */}
      {hasRight && (
        <>
          <ResizeHandle />
          <Panel
            id="right"
            defaultSize={rightDefaultSize}
            minSize={rightMinSize}
            maxSize={rightMaxSize}
            className="overflow-hidden"
            collapsible
            panelRef={setPanelRef}
          >
            {right}
          </Panel>
        </>
      )}
    </Group>
  );
}

interface ResizableSplitProps {
  /** First panel content */
  first: ReactNode;
  /** First panel default size (percentage) */
  firstDefaultSize?: number;
  /** Second panel content */
  second: ReactNode;
  /** Orientation of split */
  orientation?: Orientation;
  /** Layout ID for persistence */
  layoutId?: string;
  /** Additional class name */
  className?: string;
}

/**
 * Simple two-panel resizable split
 */
export function ResizableSplit({
  first,
  firstDefaultSize = 50,
  second,
  orientation = 'vertical',
  layoutId,
  className = '',
}: ResizableSplitProps) {
  const { loadLayout, saveLayout } = useLayoutStorage(layoutId ?? 'split');
  const Handle = orientation === 'horizontal' ? HorizontalResizeHandle : ResizeHandle;

  return (
    <Group
      orientation={orientation}
      className={`h-full ${className}`}
      defaultLayout={loadLayout()}
      onLayoutChange={saveLayout}
    >
      <Panel id="first" defaultSize={firstDefaultSize} minSize={20} className="overflow-hidden">
        {first}
      </Panel>
      <Handle />
      <Panel id="second" minSize={20} className="overflow-hidden">
        {second}
      </Panel>
    </Group>
  );
}

export { ResizeHandle, HorizontalResizeHandle };
