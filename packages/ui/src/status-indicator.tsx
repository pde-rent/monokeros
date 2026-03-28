import React from "react";
import { MemberStatus } from "@monokeros/types";
import { MEMBER_STATUS_COLORS } from "@monokeros/constants";

interface StatusIndicatorProps {
  status: MemberStatus;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const SIZE_CLASSES = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" };
const RADIUS = "var(--radius-sm)";

export function StatusIndicator({ status, size = "md", pulse = false }: StatusIndicatorProps) {
  const shouldPulse = pulse || status === MemberStatus.WORKING;
  const color = MEMBER_STATUS_COLORS[status] ?? MEMBER_STATUS_COLORS[MemberStatus.OFFLINE];

  return (
    <span className="relative inline-flex items-center justify-center shrink-0 self-center">
      <span
        className={`inline-flex shrink-0 ${SIZE_CLASSES[size]}`}
        style={{ backgroundColor: color, borderRadius: RADIUS }}
      />
      {shouldPulse && (
        <span
          className={`absolute inline-flex shrink-0 animate-ping opacity-75`}
          style={{ backgroundColor: color, borderRadius: RADIUS, width: "100%", height: "100%" }}
        />
      )}
    </span>
  );
}
