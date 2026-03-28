import React from "react";

interface ColorDotProps {
  color: string;
  size?: "xs" | "sm" | "md";
}

const SIZE_CLASSES = { xs: "h-1.5 w-1.5", sm: "h-2 w-2", md: "h-2.5 w-2.5" };

export function ColorDot({ color, size = "sm" }: ColorDotProps) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-sm ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: color }}
    />
  );
}
