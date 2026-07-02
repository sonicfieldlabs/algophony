/**
 * Algophony Studio — Generic loading skeleton.
 *
 * Re-used by sub-route loading.tsx files so every dashboard section renders
 * the same scaffolding during SSR fetch instead of a blank screen.
 */

interface LoadingSkeletonProps {
  rows?: number;
  showStats?: boolean;
  showHeader?: boolean;
}

export function LoadingSkeleton({
  rows = 5,
  showStats = false,
  showHeader = true,
}: LoadingSkeletonProps) {
  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {showHeader && (
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-atlas-surface-hover animate-shimmer" />
          <div>
            <div className="h-4 w-32 rounded bg-atlas-surface-hover animate-shimmer mb-1" />
            <div className="h-3 w-48 rounded bg-atlas-surface-hover animate-shimmer" />
          </div>
        </div>
      )}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="atlas-card p-4">
              <div className="h-3 w-20 rounded bg-atlas-surface-hover animate-shimmer mb-3" />
              <div className="h-7 w-12 rounded bg-atlas-surface-hover animate-shimmer" />
            </div>
          ))}
        </div>
      )}
      <div className="atlas-card p-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="h-3 rounded bg-atlas-surface-hover animate-shimmer"
              style={{ width: `${60 + (i * 7) % 30}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
