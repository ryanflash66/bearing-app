export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="mt-2 h-4 w-64 rounded bg-slate-200" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="mt-2 h-6 w-16 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <div className="h-6 w-32 rounded bg-slate-200" />
        <div className="mt-4 space-y-3">
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-5/6 rounded bg-slate-200" />
          <div className="h-4 w-4/6 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

