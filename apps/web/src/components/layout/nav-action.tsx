export function NavAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 py-2 text-xs text-fg-2 hover:bg-surface-3 hover:text-fg"
    >
      {icon}
      {label}
    </button>
  );
}
