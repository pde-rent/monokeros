export default function Loading() {
  return (
    <div className="flex h-full">
      <div className="w-[var(--layout-sidebar-width)] shrink-0 border-r border-edge p-3 space-y-3">
        <div className="h-4 w-24 animate-pulse rounded-sm bg-surface-2" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded-sm bg-surface-2" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-8">
        <div className="flex gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 w-56 animate-pulse rounded-md bg-surface-2" />
          ))}
        </div>
      </div>
    </div>
  );
}
