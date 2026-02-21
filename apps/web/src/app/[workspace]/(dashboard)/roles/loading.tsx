export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-6 w-32 animate-pulse rounded-sm bg-surface-2" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
