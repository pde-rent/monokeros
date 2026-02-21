export default function Loading() {
  return (
    <div className="flex h-full">
      <div className="w-[var(--layout-sidebar-width)] shrink-0 border-r border-edge p-3 space-y-2">
        <div className="h-4 w-16 animate-pulse rounded-sm bg-surface-2" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-sm bg-surface-2" />
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
              <div className={`h-16 animate-pulse rounded-sm bg-surface-2 ${i % 2 === 0 ? 'w-1/3' : 'w-2/3'}`} />
            </div>
          ))}
        </div>
        <div className="border-t border-edge p-4">
          <div className="h-10 animate-pulse rounded-sm bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
