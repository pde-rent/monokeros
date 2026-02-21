import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  function Card({ children, className = '', onClick, interactive = false, ...rest }, ref) {
    const interactiveStyles = interactive || onClick
      ? 'cursor-pointer hover:border-edge-hover transition-all'
      : '';

    function handleKeyDown(e: React.KeyboardEvent) {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    }

    return (
      <div
        ref={ref}
        onClick={onClick}
        onKeyDown={onClick ? handleKeyDown : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={`
          rounded-lg
          border border-edge
          bg-elevated
          ${interactiveStyles}
          ${className}
        `}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, children, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between border-b border-edge px-4 py-3 ${className}`}>
      <div>
        {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
        {subtitle && <p className="text-xs text-fg-2">{subtitle}</p>}
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`border-t border-edge px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

// Compact card variant for grid/list items
interface CardItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function CardItem({ children, onClick, className = '' }: CardItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left
        rounded-md
        border border-edge
        bg-surface
        p-4
        transition-all
        hover:border-edge-hover
        ${className}
      `}
    >
      {children}
    </button>
  );
}
