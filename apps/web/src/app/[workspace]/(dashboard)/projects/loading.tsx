export default function Loading() {
  return (
    <div className="flex h-full">
      <div className="w-[var(--layout-sidebar-width)] shrink-0 border-r border-edge p-3 space-y-3">
        <div className="h-4 w-20 animate-pulse rounded-sm bg-surface-2" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-sm bg-surface-2" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-72 shrink-0 space-y-3 rounded-md">
            <div className="h-8 animate-pulse rounded-sm bg-surface-2" />
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-24 animate-pulse rounded-sm bg-surface-2" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
