'use client';

import React, { useRef, useState } from 'react';
import { useClickOutside } from './use-click-outside';

export interface DropupMenuItem {
  id: string;
  label: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

interface DropupMenuProps {
  trigger: React.ReactNode;
  items: DropupMenuItem[];
  minWidth?: string;
  className?: string;
}

/**
 * A dropdown menu that opens upward from a trigger button.
 * Handles click-outside to close automatically.
 */
export function DropupMenu({ trigger, items, minWidth = '140px', className = '' }: DropupMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div onClick={() => setOpen((o) => !o)}>
        {trigger}
      </div>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 z-30 border border-edge bg-elevated py-0.5 shadow-md rounded-md"
          style={{ minWidth }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
              disabled={item.disabled}
              className={`flex w-full items-center px-2.5 py-0.5 text-left text-sm transition-colors rounded-sm mx-0.5 ${
                item.isActive
                  ? 'bg-surface-2 text-fg font-medium'
                  : 'text-fg-2 hover:bg-surface-2'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
