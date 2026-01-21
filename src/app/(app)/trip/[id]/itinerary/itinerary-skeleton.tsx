import { Skeleton } from '@/components/ui/skeleton';

export function ItinerarySkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Days skeleton */}
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
