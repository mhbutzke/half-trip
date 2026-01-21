import { Skeleton } from '@/components/ui/skeleton';

export function ItinerarySkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
        </div>
      </div>

      {/* Summary Skeleton */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
        <div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-1 h-8 w-12" />
        </div>
        <Skeleton className="h-11 w-36" />
      </div>

      {/* Day Sections Skeleton */}
      <div className="space-y-8">
        {[1, 2, 3].map((day) => (
          <div key={day} className="space-y-4">
            {/* Day Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div>
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="mt-1 h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-9 w-24" />
            </div>

            {/* Activity Cards Skeleton */}
            <div className="space-y-3">
              {day === 1 && (
                <>
                  <ActivityCardSkeleton />
                  <ActivityCardSkeleton />
                </>
              )}
              {day === 2 && <ActivityCardSkeleton />}
              {day === 3 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="mt-3 h-4 w-32" />
                  <Skeleton className="mt-1 h-4 w-48" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityCardSkeleton() {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48" />
          <div className="mt-2 flex gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
      </div>
    </div>
  );
}
