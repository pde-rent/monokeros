import React from 'react';

interface PanelSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function PanelSection({
  title,
  children,
  className = '',
  collapsible = false,
  defaultOpen = true,
}: PanelSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (collapsible && title) {
    return (
      <div className={`border-b border-edge ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-2"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">
            {title}
          </span>
          <span className="text-xs text-fg-3">
            {isOpen ? '−' : '+'}
          </span>
        </button>
        {isOpen && <div className="px-3 pb-3">{children}</div>}
      </div>
    );
  }

  return (
    <div className={`border-b border-edge ${className}`}>
      {title && (
        <div className="px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">
            {title}
          </span>
        </div>
      )}
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}


interface PanelHeaderProps {
  title: string;
  onClose?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ title, onClose, action, className = '' }: PanelHeaderProps) {
  return (
    <div
      className={`
        flex items-center justify-between
        border-b border-edge
        px-3 py-2
        ${className}
      `}
    >
      <span className="text-sm font-semibold text-fg">{title}</span>
      <div className="flex items-center gap-1">
        {action}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-fg-3 hover:bg-surface-2 hover:text-fg"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
