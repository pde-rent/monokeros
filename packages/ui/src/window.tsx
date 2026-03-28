"use client";

import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { XIcon, CornersOutIcon, CopyIcon } from "@phosphor-icons/react";

// ── Types ───────────────────────────────────────────────────────────────────

type TileZone =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | null;

interface TileRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Tile Zone Calculations ──────────────────────────────────────────────────

const TILE_ZONE_THRESHOLD = 24; // pixels from edge to trigger zone
const HEADER_HEIGHT = 40; // approximate header height to exclude

function getTileRect(zone: TileZone): TileRect | null {
  if (!zone) return null;
  const w = window.innerWidth;
  const h = window.innerHeight - HEADER_HEIGHT;
  const halfW = w / 2;
  const halfH = h / 2;

  const rects: Record<Exclude<TileZone, null>, TileRect> = {
    left: { x: 0, y: HEADER_HEIGHT, width: halfW, height: h },
    right: { x: halfW, y: HEADER_HEIGHT, width: halfW, height: h },
    top: { x: 0, y: HEADER_HEIGHT, width: w, height: halfH },
    bottom: { x: 0, y: HEADER_HEIGHT + halfH, width: w, height: halfH },
    "top-left": { x: 0, y: HEADER_HEIGHT, width: halfW, height: halfH },
    "top-right": { x: halfW, y: HEADER_HEIGHT, width: halfW, height: halfH },
    "bottom-left": { x: 0, y: HEADER_HEIGHT + halfH, width: halfW, height: halfH },
    "bottom-right": { x: halfW, y: HEADER_HEIGHT + halfH, width: halfW, height: halfH },
  };
  return rects[zone] ?? null;
}

function detectTileZone(x: number, y: number): TileZone {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const t = TILE_ZONE_THRESHOLD;

  const nearLeft = x < t;
  const nearRight = x > w - t;
  const nearTop = y < t + HEADER_HEIGHT;
  const nearBottom = y > h - t;

  if (nearTop && nearLeft) return "top-left";
  if (nearTop && nearRight) return "top-right";
  if (nearBottom && nearLeft) return "bottom-left";
  if (nearBottom && nearRight) return "bottom-right";
  if (nearLeft) return "left";
  if (nearRight) return "right";
  if (nearTop) return "top";
  if (nearBottom) return "bottom";
  return null;
}

// ── Window Manager Context ──────────────────────────────────────────────────

interface WindowContextType {
  bringToFront: (id: string) => void;
  getZIndex: (id: string) => number;
  activeWindowId: string | null;
  setActiveWindow: (id: string | null) => void;
  tileWindow: (id: string, zone: TileZone) => void;
  registerWindow: (id: string) => void;
  unregisterWindow: (id: string) => void;
  getWindowIds: () => string[];
}

const WindowContext = createContext<WindowContextType | null>(null);

let globalZIndex = 100;

export function WindowProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<Map<string, number>>(new Map());
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const windowIdsRef = useRef<Set<string>>(new Set());

  const bringToFront = useCallback((id: string) => {
    globalZIndex += 1;
    setWindows((prev) => {
      const next = new Map(prev);
      next.set(id, globalZIndex);
      return next;
    });
    setActiveWindowId(id);
  }, []);

  const getZIndex = useCallback((id: string) => windows.get(id) ?? 100, [windows]);

  const tileWindow = useCallback((id: string, zone: TileZone) => {
    // Dispatch custom event that the Window component will listen to
    window.dispatchEvent(new CustomEvent("window:tile", { detail: { id, zone } }));
  }, []);

  const registerWindow = useCallback((id: string) => {
    windowIdsRef.current.add(id);
  }, []);

  const unregisterWindow = useCallback((id: string) => {
    windowIdsRef.current.delete(id);
    setActiveWindowId((prev) => (prev === id ? null : prev));
  }, []);

  const getWindowIds = useCallback(() => Array.from(windowIdsRef.current), []);

  // Global keyboard shortcuts for tiling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeWindowId) return;

      // Meta/Ctrl + Arrow keys for tiling
      if (e.metaKey || e.ctrlKey) {
        let zone: TileZone = null;
        switch (e.key) {
          case "ArrowLeft":
            zone = e.shiftKey ? "bottom-left" : "left";
            break;
          case "ArrowRight":
            zone = e.shiftKey ? "bottom-right" : "right";
            break;
          case "ArrowUp":
            zone = e.shiftKey ? "top-left" : "top";
            break;
          case "ArrowDown":
            zone = e.shiftKey ? "bottom" : "bottom";
            break;
        }
        if (zone) {
          e.preventDefault();
          tileWindow(activeWindowId, zone);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeWindowId, tileWindow]);

  return (
    <WindowContext.Provider
      value={{
        bringToFront,
        getZIndex,
        activeWindowId,
        setActiveWindow: setActiveWindowId,
        tileWindow,
        registerWindow,
        unregisterWindow,
        getWindowIds,
      }}
    >
      {children}
    </WindowContext.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(WindowContext);
  if (!ctx) {
    return {
      bringToFront: () => {},
      getZIndex: () => 100,
      activeWindowId: null,
      setActiveWindow: () => {},
      tileWindow: () => {},
      registerWindow: () => {},
      unregisterWindow: () => {},
      getWindowIds: () => [],
    };
  }
  return ctx;
}

// ── Tile Zone Overlay ───────────────────────────────────────────────────────

interface TileZoneOverlayProps {
  zone: TileZone;
}

function TileZoneOverlay({ zone }: TileZoneOverlayProps) {
  const rect = getTileRect(zone);
  if (!rect) return null;

  return (
    <div
      className="fixed bg-blue/20 border-2 border-blue border-dashed rounded-lg pointer-events-none z-[9999] transition-opacity duration-150"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}

// ── Window Component ────────────────────────────────────────────────────────

interface WindowProps {
  id?: string;
  title: string;
  icon?: React.ReactNode;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  height?: number | "auto";
  minWidth?: number;
  minHeight?: number;
  x?: number;
  y?: number;
  resizable?: boolean;
  maximizable?: boolean;
  showMinimize?: boolean;
  className?: string;
}

export function Window({
  id,
  title,
  icon,
  open,
  onClose,
  children,
  width = 600,
  height = 400,
  minWidth = 300,
  minHeight = 200,
  x,
  y,
  resizable = true,
  maximizable = true,
  showMinimize = false,
  className = "",
}: WindowProps) {
  const windowId = useRef(id || `window-${Math.random().toString(36).slice(2)}`);
  const { bringToFront, getZIndex, registerWindow, unregisterWindow } = useWindowManager();

  const isAutoHeight = height === "auto";
  const [position, setPosition] = useState({ x: x ?? -1, y: y ?? -1 });
  const [size, setSize] = useState({ width, height: isAutoHeight ? 0 : height });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTiled, setIsTiled] = useState<TileZone>(null);
  const [prevSize, setPrevSize] = useState({ width, height: isAutoHeight ? 0 : height });
  const [prevPosition, setPrevPosition] = useState({ x: 0, y: 0 });
  const [previewZone, setPreviewZone] = useState<TileZone>(null);

  const windowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const resizeDir = useRef<string>("");
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, windowX: 0, windowY: 0 });

  // Register/unregister window
  useEffect(() => {
    registerWindow(windowId.current);
    return () => unregisterWindow(windowId.current);
  }, [registerWindow, unregisterWindow]);

  // Center window on first mount
  useEffect(() => {
    if (open && position.x === -1) {
      const centerX = Math.max(0, (window.innerWidth - size.width) / 2);
      const centerY = isAutoHeight
        ? Math.max(HEADER_HEIGHT, window.innerHeight * 0.2)
        : Math.max(0, (window.innerHeight - size.height) / 2);
      setPosition({ x: centerX, y: centerY });
    }
  }, [open, size.width, size.height, position.x, isAutoHeight]);

  // Listen for tile events
  useEffect(() => {
    const handleTile = (e: CustomEvent<{ id: string; zone: TileZone }>) => {
      if (e.detail.id !== windowId.current) return;

      const zone = e.detail.zone;
      if (!zone) return;

      const rect = getTileRect(zone);
      if (!rect) return;

      // Store previous state if not already tiled/maximized
      if (!isTiled && !isMaximized) {
        setPrevSize(size);
        setPrevPosition(position);
      }

      setPosition({ x: rect.x, y: rect.y });
      setSize({ width: rect.width, height: rect.height });
      setIsTiled(zone);
      setIsMaximized(false);
    };

    window.addEventListener("window:tile", handleTile as EventListener);
    return () => window.removeEventListener("window:tile", handleTile as EventListener);
  }, [size, position, isTiled, isMaximized]);

  // Bring to front on click
  const handleFocus = useCallback(() => {
    bringToFront(windowId.current);
  }, [bringToFront]);

  // ── Drag handling with tile preview ───────────────────────────────────────

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    // Auto-height windows (dialogs) are not draggable
    if (isAutoHeight) return;
    e.preventDefault();

    // If tiled or maximized, untile first
    if (isTiled || isMaximized) {
      // Restore to center at cursor position
      const restoreSize = prevSize.width > 0 ? prevSize : { width: 600, height: 400 };
      const newX = e.clientX - restoreSize.width / 2;
      const newY = e.clientY - 10; // offset from title bar

      setSize(restoreSize);
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - restoreSize.width, newX)),
        y: Math.max(HEADER_HEIGHT, Math.min(window.innerHeight - 100, newY)),
      });
      setIsTiled(null);
      setIsMaximized(false);
    }

    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    handleFocus();
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // ── Resize handling ──────────────────────────────────────────────────────

  const handleResizeMouseDown = (e: React.MouseEvent, dir: string) => {
    if (isMaximized || isTiled || !resizable) return;
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    resizeDir.current = dir;
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      windowX: position.x,
      windowY: position.y,
    };
    handleFocus();
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging.current) {
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;

        // Detect tile zone during drag
        const zone = detectTileZone(e.clientX, e.clientY);
        setPreviewZone(zone);

        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 100, newX)),
          y: Math.max(0, Math.min(window.innerHeight - 100, newY)),
        });
      }
      if (isResizing.current) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        const dir = resizeDir.current;

        let newWidth = resizeStart.current.width;
        let newHeight = resizeStart.current.height;
        let newX = resizeStart.current.windowX;
        let newY = resizeStart.current.windowY;

        if (dir.includes("e")) newWidth = Math.max(minWidth, resizeStart.current.width + dx);
        if (dir.includes("w")) {
          newWidth = Math.max(minWidth, resizeStart.current.width - dx);
          newX = resizeStart.current.windowX + (resizeStart.current.width - newWidth);
        }
        if (dir.includes("s")) newHeight = Math.max(minHeight, resizeStart.current.height + dy);
        if (dir.includes("n")) {
          newHeight = Math.max(minHeight, resizeStart.current.height - dy);
          newY = resizeStart.current.windowY + (resizeStart.current.height - newHeight);
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    },
    [minWidth, minHeight],
  );

  const handleMouseUp = useCallback(() => {
    // Apply tile zone on drop
    if (isDragging.current && previewZone) {
      const rect = getTileRect(previewZone);
      if (rect) {
        if (!isTiled && !isMaximized) {
          setPrevSize(size);
          setPrevPosition(position);
        }
        setPosition({ x: rect.x, y: rect.y });
        setSize({ width: rect.width, height: rect.height });
        setIsTiled(previewZone);
        setIsMaximized(false);
      }
    }

    isDragging.current = false;
    isResizing.current = false;
    setPreviewZone(null);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove, previewZone, isTiled, isMaximized, size, position]);

  // ── Maximize/Restore ─────────────────────────────────────────────────────

  const handleMaximize = () => {
    if (!maximizable) return;
    if (isMaximized || isTiled) {
      setIsMaximized(false);
      setIsTiled(null);
      setSize(
        prevSize.width > 0 ? prevSize : { width, height: isAutoHeight ? 400 : (height as number) },
      );
      setPosition(
        prevPosition.x >= 0
          ? prevPosition
          : {
              x: (window.innerWidth - width) / 2,
              y: (window.innerHeight - (isAutoHeight ? 400 : (height as number))) / 2,
            },
      );
    } else {
      setPrevSize(size);
      setPrevPosition(position);
      setIsMaximized(true);
      setIsTiled(null);
    }
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, onClose]);

  // ── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!open) return null;

  const zIndex = getZIndex(windowId.current);
  const isConstrained = isMaximized || !!isTiled;

  const windowStyle: React.CSSProperties = isMaximized
    ? { left: 0, top: 0, width: "100%", height: "100%", zIndex }
    : {
        left: position.x,
        top: position.y,
        width: size.width,
        height: isAutoHeight ? "auto" : size.height,
        zIndex,
      };

  return (
    <>
      {/* Tile zone preview overlay */}
      {previewZone && <TileZoneOverlay zone={previewZone} />}

      <div
        ref={windowRef}
        className={`fixed flex flex-col border border-edge bg-elevated shadow-2xl rounded-lg overflow-hidden ${
          isConstrained ? "" : "resize-none"
        }`}
        style={windowStyle}
        onClick={handleFocus}
        onMouseDown={handleFocus}
      >
        {/* Title bar */}
        <div
          className={`flex items-center gap-2 h-9 px-3 bg-surface-2 border-b border-edge select-none shrink-0 ${
            isConstrained || isAutoHeight ? "" : "cursor-move"
          }`}
          onMouseDown={handleTitleMouseDown}
          onDoubleClick={handleMaximize}
        >
          {icon && <span className="text-fg-2">{icon}</span>}
          <span className="flex-1 text-xs font-medium text-fg truncate">{title}</span>
          <div className="flex items-center gap-0.5">
            {showMinimize && (
              <button
                onClick={onClose}
                className="flex items-center justify-center w-6 h-6 text-fg-3 hover:text-fg hover:bg-surface-3 rounded"
                title="Minimize"
              >
                <CopyIcon size={12} weight="bold" />
              </button>
            )}
            {maximizable && (
              <button
                onClick={handleMaximize}
                className="flex items-center justify-center w-6 h-6 text-fg-3 hover:text-fg hover:bg-surface-3 rounded"
                title={isMaximized || isTiled ? "Restore" : "Maximize"}
              >
                <CornersOutIcon size={12} weight="bold" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-6 h-6 text-fg-3 hover:text-red hover:bg-red/10 rounded"
              title="Close"
            >
              <XIcon size={12} weight="bold" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-hidden ${className}`}>{children}</div>

        {/* Resize handles */}
        {resizable && !isConstrained && (
          <>
            <div
              className="absolute top-0 left-2 right-2 h-1 cursor-n-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, "n")}
            />
            <div
              className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, "s")}
            />
            <div
              className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, "w")}
            />
            <div
              className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, "e")}
            />
            <div
              className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
            />
            <div
              className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
            />
            <div
              className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
            />
            <div
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, "se")}
            />
          </>
        )}
      </div>
    </>
  );
}

// ── Dialog (self-contained modal for CRUD forms) ─────────────────────────────

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}

export function Dialog({ open, onClose, title, icon, children, width = 480 }: DialogProps) {
  // Escape-to-close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Dialog chrome */}
      <div
        className="relative flex flex-col max-h-[85vh] border border-edge bg-elevated shadow-2xl rounded-lg overflow-hidden"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 h-9 px-3 bg-surface-2 border-b border-edge select-none shrink-0">
          {icon && <span className="text-fg-2">{icon}</span>}
          <span className="flex-1 text-xs font-medium text-fg truncate">{title}</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 text-fg-3 hover:text-red hover:bg-red/10 rounded"
            title="Close"
          >
            <XIcon size={12} weight="bold" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto">
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
