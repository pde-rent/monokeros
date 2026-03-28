export default function Loading() {
  return (
    <div className="flex h-full">
      <div className="w-[240px] shrink-0 border-r border-edge p-3 space-y-2">
        <div className="h-4 w-16 animate-pulse rounded-sm bg-surface-2" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-sm bg-surface-2" />
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="aspect-[4/3] w-[80%] max-w-[800px] animate-pulse rounded-sm bg-surface-2" />
      </div>
    </div>
  );
}
