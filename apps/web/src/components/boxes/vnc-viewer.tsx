"use client";

import { useRef, useEffect, useState } from "react";
import RFB from "@novnc/novnc/lib/rfb";
import { CircleNotchIcon, WifiXIcon } from "@phosphor-icons/react";

interface VncViewerProps {
  wsUrl: string;
  viewOnly: boolean;
  className?: string;
}

type Status = "connecting" | "connected" | "disconnected";

export default function VncViewer({ wsUrl, viewOnly, className }: VncViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setStatus("connecting");

    const rfb = new RFB(el, wsUrl);
    rfb.scaleViewport = true;
    rfb.resizeSession = false;
    rfb.qualityLevel = 4;
    rfb.compressionLevel = 3;
    rfb.viewOnly = viewOnly;

    rfb.addEventListener("connect", () => {
      setStatus("connected");
    });

    rfb.addEventListener("disconnect", () => {
      setStatus("disconnected");
    });

    rfbRef.current = rfb;

    return () => {
      rfbRef.current = null;
      rfb.disconnect();
    };
  }, [wsUrl]);

  // Update viewOnly on the live instance without reconnecting
  useEffect(() => {
    if (rfbRef.current) {
      rfbRef.current.viewOnly = viewOnly;
    }
  }, [viewOnly]);

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <div ref={containerRef} className="h-full w-full" />

      {status === "connecting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-2 text-fg-2">
            <CircleNotchIcon size={20} className="animate-spin" />
            <span className="text-[10px]">Connecting...</span>
          </div>
        </div>
      )}

      {status === "disconnected" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-2 text-fg-2">
            <WifiXIcon size={20} />
            <span className="text-[10px]">Desktop disconnected</span>
          </div>
        </div>
      )}
    </div>
  );
}
