import React from "react";
import { XIcon } from "@phosphor-icons/react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

/**
 * A reusable section header with border, title, and optional close button.
 * Used in dialogs, panels, and filter sections.
 *
 * Pattern: flex items-center justify-between border-b border-edge px-4 py-2
 */
export function SectionHeader({
  title,
  subtitle,
  icon,
  action,
  onClose,
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between border-b border-edge px-4 py-2 ${className}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <span className="text-xs font-semibold text-fg">{title}</span>
          {subtitle && <p className="text-[10px] text-fg-3">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action}
        {onClose && (
          <button onClick={onClose} className="text-fg-3 hover:text-fg transition-colors">
            <XIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
