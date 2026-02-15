import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  hasHeader?: boolean;
  headerLines?: number;
  contentLines?: number;
  hasFooter?: boolean;
}

export function SkeletonCard({
  className,
  hasHeader = true,
  headerLines = 2,
  contentLines = 3,
  hasFooter = false,
}: SkeletonCardProps) {
  return (
    <Card className={cn('animate-pulse', className)}>
      {hasHeader && (
        <CardHeader className="space-y-2">
          {Array.from({ length: headerLines }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn('h-4', i === 0 ? 'w-3/4' : 'w-1/2')}
            />
          ))}
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: contentLines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-4', i % 2 === 0 ? 'w-full' : 'w-2/3')}
          />
        ))}
      </CardContent>
      {hasFooter && (
        <div className="px-6 pb-6">
          <Skeleton className="h-10 w-full" />
        </div>
      )}
    </Card>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 3, className }: SkeletonListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  cols?: 2 | 3 | 4;
  className?: string;
}

export function SkeletonGrid({ count = 6, cols = 3, className }: SkeletonGridProps) {
  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[cols];

  return (
    <div className={cn('grid gap-4', gridClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
