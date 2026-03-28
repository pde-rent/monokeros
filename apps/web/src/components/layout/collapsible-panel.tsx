"use client";

import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { Panel } from "react-resizable-panels";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

/** Width of the collapsed notch in pixels */
const NOTCH_WIDTH = 40;

/** Default expanded width for side panels */
const DEFAULT_EXPANDED_WIDTH = 280;

/** Minimum expanded width (user can't resize below this) */
const MIN_EXPANDED_WIDTH = 180;

/** Maximum expanded width */
const MAX_EXPANDED_WIDTH = 450;

interface CollapsiblePanelProps {
  /** Panel title (shown vertically when collapsed) */
  title: string;
  /** Panel content when expanded */
  children: ReactNode;
  /** Side the panel is on - affects icon direction */
  side: "left" | "right";
  /** Whether the panel is currently collapsed */
  collapsed?: boolean;
  /** Callback when collapse button is clicked */
  onToggleCollapse?: () => void;
  /** Optional element to render on the right side of the header (before collapse button) */
  headerRight?: ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * A panel that can collapse to show just a vertical title with expand button.
 * Used for side panels (left sidebar, right detail panel).
 * Collapse state is controlled externally (by parent via react-resizable-panels).
 */
export function CollapsiblePanel({
  title,
  children,
  side,
  collapsed = false,
  onToggleCollapse,
  headerRight,
  className = "",
}: CollapsiblePanelProps) {
  if (collapsed) {
    // Collapsed state: vertical title with expand button (notch)
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center bg-surface py-4 transition-colors hover:bg-surface-2 ${className}`}
        onClick={onToggleCollapse}
      >
        <button
          className="mb-2 flex h-6 w-6 items-center justify-center rounded-sm text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse?.();
          }}
          title="Expand"
        >
          {side === "left" ? <CaretRightIcon size={14} /> : <CaretLeftIcon size={14} />}
        </button>
        <div
          className="whitespace-nowrap text-xs font-medium uppercase tracking-wider text-fg-3"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: side === "left" ? "rotate(180deg)" : "none",
          }}
        >
          {title}
        </div>
      </div>
    );
  }

  // Expanded state: full content with collapse button
  return (
    <div className={`flex h-full flex-col bg-surface ${className}`}>
      {/* Header — entire bar is clickable to collapse */}
      <div className="flex shrink-0 items-center justify-between border-b border-edge px-3 py-2 w-full transition-colors hover:bg-surface-2">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 text-left flex-1"
          title="Collapse"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-fg">{title}</span>
        </button>
        {headerRight}
        <button
          onClick={onToggleCollapse}
          className="text-fg-3 hover:text-fg transition-colors ml-2"
          title="Collapse"
        >
          {side === "left" ? <CaretLeftIcon size={14} /> : <CaretRightIcon size={14} />}
        </button>
      </div>
      {/* Content area - full width */}
      <div className="w-full flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * Panel ref interface from react-resizable-panels
 * getSize returns { asPercentage, inPixels }
 */
export interface CollapsiblePanelRef {
  collapse: () => void;
  expand: () => void;
  isCollapsed: () => boolean;
  resize: (size: number) => void;
  getSize: () => { asPercentage: number; inPixels: number };
}

/**
 * Return type for useCollapsiblePanel hook
 */
export interface UseCollapsiblePanelReturn {
  ref: React.MutableRefObject<CollapsiblePanelRef | null>;
  collapsed: boolean;
  toggleCollapse: () => void;
  collapse: () => void;
  expand: () => void;
}

/**
 * Hook to manage collapsible panel state with react-resizable-panels.
 * Instead of using the panel's collapse() method (which hides the panel),
 * this resizes the panel to a minimum "notch" width while keeping it visible.
 */
export function useCollapsiblePanel(
  defaultWidth: number = DEFAULT_EXPANDED_WIDTH,
  startCollapsed: boolean = false,
): UseCollapsiblePanelReturn {
  const ref = useRef<CollapsiblePanelRef | null>(null);
  const [collapsed, setCollapsed] = useState(startCollapsed);
  const expandedWidthRef = useRef(defaultWidth);
  const initializedRef = useRef(false);

  // Initialize collapsed state on mount if startCollapsed is true
  useEffect(() => {
    if (startCollapsed && !initializedRef.current) {
      initializedRef.current = true;
      // Defer to next tick to ensure panel ref is available
      const timer = setTimeout(() => {
        const panel = ref.current;
        if (panel) {
          panel.resize(NOTCH_WIDTH);
          setCollapsed(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [startCollapsed]);

  // Track collapsed state by polling (react-resizable-panels doesn't have callbacks)
  useEffect(() => {
    const checkState = () => {
      const panel = ref.current;
      if (panel) {
        const { inPixels } = panel.getSize();
        const isNowCollapsed = inPixels <= NOTCH_WIDTH + 5; // Small buffer for floating point
        setCollapsed(isNowCollapsed);

        // Track expanded width when not collapsed
        if (!isNowCollapsed && inPixels > NOTCH_WIDTH + 5) {
          expandedWidthRef.current = inPixels;
        }
      }
    };

    const interval = setInterval(checkState, 100);
    return () => clearInterval(interval);
  }, []);

  const collapse = useCallback(() => {
    const panel = ref.current;
    if (panel) {
      // Save current width before collapsing
      const { inPixels } = panel.getSize();
      if (inPixels > NOTCH_WIDTH + 5) {
        expandedWidthRef.current = inPixels;
      }
      panel.resize(NOTCH_WIDTH);
    }
  }, []);

  const expand = useCallback(() => {
    const panel = ref.current;
    if (panel) {
      panel.resize(expandedWidthRef.current);
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    if (collapsed) {
      expand();
    } else {
      collapse();
    }
  }, [collapsed, collapse, expand]);

  return {
    ref,
    collapsed,
    toggleCollapse,
    collapse,
    expand,
  };
}

interface CollapsibleSidePanelProps {
  /** Panel id for react-resizable-panels */
  id: string;
  /** Panel title shown in header */
  title: string;
  /** Which side the panel is on */
  side: "left" | "right";
  /** Hook return from useCollapsiblePanel */
  panel: UseCollapsiblePanelReturn;
  /** Default expanded width in px (defaults to DEFAULT_EXPANDED_WIDTH) */
  defaultWidth?: number;
  /** Optional element in the header (before collapse button) */
  headerRight?: ReactNode;
  children: ReactNode;
}

/**
 * Combines react-resizable-panels Panel with CollapsiblePanel,
 * wiring up refs and sizes automatically.
 */
export function CollapsibleSidePanel({
  id,
  title,
  side,
  panel,
  defaultWidth = DEFAULT_EXPANDED_WIDTH,
  headerRight,
  children,
}: CollapsibleSidePanelProps) {
  return (
    <Panel
      id={id}
      defaultSize={`${defaultWidth}px`}
      minSize={`${NOTCH_WIDTH}px`}
      maxSize={`${MAX_EXPANDED_WIDTH}px`}
      className="overflow-hidden"
      panelRef={(ref) => {
        panel.ref.current = ref;
      }}
    >
      <CollapsiblePanel
        title={title}
        side={side}
        collapsed={panel.collapsed}
        onToggleCollapse={panel.toggleCollapse}
        headerRight={headerRight}
      >
        {children}
      </CollapsiblePanel>
    </Panel>
  );
}

// Export constants for use in Panel props
export const PANEL_CONSTANTS = {
  NOTCH_WIDTH,
  DEFAULT_EXPANDED_WIDTH,
  MIN_EXPANDED_WIDTH,
  MAX_EXPANDED_WIDTH,
};
