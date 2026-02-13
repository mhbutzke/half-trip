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

      {/* Search & Filters Skeleton */}
      <div className="space-y-3 rounded-lg border bg-muted/20 p-3 sm:p-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-md" />
          ))}
        </div>
      </div>

      {/* Day Pills Skeleton */}
      <div className="flex gap-1.5 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-20 flex-shrink-0 rounded-full" />
        ))}
      </div>

      {/* Day Content Skeleton */}
      <div className="space-y-2">
        {/* Day header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="mt-1 h-4 w-40" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* Timeline items */}
        <div className="space-y-0">
          {[1, 2, 3].map((i) => (
            <TimelineItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineItemSkeleton() {
  return (
    <div className="flex items-start gap-3 py-2">
      {/* Time */}
      <div className="w-14 flex-shrink-0 pt-1.5 text-right">
        <Skeleton className="ml-auto h-4 w-10" />
      </div>

      {/* Node */}
      <div className="flex flex-col items-center">
        <div className="min-h-2 w-px" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="min-h-2 w-px border-l-2 border-dashed border-muted-foreground/10" />
      </div>

      {/* Content */}
      <div className="flex-1 pt-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-1.5 h-3 w-28" />
      </div>
    </div>
  );
}
