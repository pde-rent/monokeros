import React from 'react';

type InputVariant = 'default' | 'transparent' | 'compact';
type InputSize = 'sm' | 'md';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Visual variant: default (bordered) or transparent (for inline editing) */
  variant?: InputVariant;
  /** Size variant */
  inputSize?: InputSize;
}

const variantStyles: Record<InputVariant, string> = {
  default: `
    border border-edge
    bg-surface-2
    focus:border-blue
  `,
  transparent: `
    bg-transparent
    border-none
  `,
  compact: `
    border border-edge
    bg-surface
    focus:border-blue
  `,
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-2 py-0.5 text-sm',
  md: 'px-3 py-1.5 text-sm',
};

export function Input({
  label,
  error,
  variant = 'default',
  inputSize = 'md',
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const isCompact = variant === 'compact';
  const resolvedSize = isCompact ? 'sm' : inputSize;
  const radius = isCompact ? 'sm' : 'md';

  // Transparent variant has no wrapper/label
  if (variant === 'transparent') {
    return (
      <input
        id={inputId}
        className={`
          w-full
          text-fg
          outline-none
          placeholder:text-fg-3
          disabled:opacity-50
          ${sizeStyles[resolvedSize]}
          ${className}
        `}
        {...props}
      />
    );
  }

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={`${isCompact ? 'mb-1 block ' : ''}text-[10px] font-medium uppercase tracking-wider text-fg-3`}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          ${isCompact ? '' : 'mt-1 '}w-full
          ${radius === 'sm' ? 'rounded-sm' : 'rounded-md'}
          text-fg
          outline-none
          transition-colors
          placeholder:text-fg-3
          disabled:opacity-50
          ${variantStyles[variant]}
          ${sizeStyles[resolvedSize]}
          ${error ? 'border-red' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, id, className = '', ...props }: TextareaProps) {
  const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="text-[10px] font-medium uppercase tracking-wider text-fg-3">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          mt-1 w-full
          rounded-md
          border border-edge
          bg-surface-2
          px-3 py-1.5
          text-sm text-fg
          outline-none
          transition-colors
          placeholder:text-fg-3
          focus:border-blue
          disabled:opacity-50
          ${error ? 'border-red' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red">{error}</p>
      )}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  variant?: 'default' | 'compact';
}

export function Select({ label, error, id, options, placeholder, variant = 'default', className = '', ...props }: SelectProps) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const isCompact = variant === 'compact';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className={`${isCompact ? 'mb-1 block ' : ''}text-[10px] font-medium uppercase tracking-wider text-fg-3`}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          ${isCompact ? '' : 'mt-1 '}w-full
          ${isCompact ? 'rounded-sm' : 'rounded-md'}
          border border-edge
          ${isCompact ? 'bg-surface' : 'bg-surface-2'}
          ${isCompact ? 'px-2 py-0.5' : 'px-3 py-1.5'}
          text-sm text-fg
          outline-none
          transition-colors
          focus:border-blue
          disabled:opacity-50
          ${error ? 'border-red' : ''}
          ${className}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-red">{error}</p>
      )}
    </div>
  );
}
