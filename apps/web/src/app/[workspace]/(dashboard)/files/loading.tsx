export default function Loading() {
  return (
    <div className="flex h-full">
      <div className="w-64 shrink-0 border-r border-edge p-3 space-y-2">
        <div className="h-4 w-16 animate-pulse rounded-sm bg-surface-2" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-6 animate-pulse rounded-sm bg-surface-2" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-3">
        <div className="h-7 w-48 animate-pulse rounded-sm bg-surface-2" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-sm bg-surface-2" />
          ))}
        </div>
      </div>
    </div>
  );
}
