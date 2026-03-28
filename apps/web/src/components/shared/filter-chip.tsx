"use client";

interface Props {
  label: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

export function FilterChip({ label, color, isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-xs transition-all rounded-sm ${
        isActive ? "font-semibold" : "hover:opacity-80"
      }`}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} ${isActive ? "12%" : "6%"}, transparent)`,
        color,
        opacity: isActive ? 1 : 0.55,
      }}
    >
      {label}
    </button>
  );
}
