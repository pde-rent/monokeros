import React from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface ToggleGroupProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function ToggleGroup<T extends string>({ options, value, onChange, className }: ToggleGroupProps<T>) {
  return (
    <div className={`flex ${className ?? ''}`}>
      {options.map((option, i) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex-1 py-1 text-xs transition-colors flex items-center justify-center gap-1 ${
              i > 0 ? 'border-l border-edge' : ''
            } ${
              isActive
                ? 'bg-blue-light text-fg font-medium'
                : 'text-fg-2 hover:text-fg'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
