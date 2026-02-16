'use client';

import { Clock, Timer, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ActivityQuickInfoProps {
  startTime?: string | null;
  duration?: string | null;
  rating?: number;
  reviewCount?: number;
  className?: string;
}

export function ActivityQuickInfo({
  startTime,
  duration,
  rating,
  reviewCount,
  className,
}: ActivityQuickInfoProps) {
  const hasAnyInfo = startTime || duration || rating;

  if (!hasAnyInfo) return null;

  return (
    <Card className={cn('border-muted/70 bg-muted/30', className)}>
      <CardContent className="flex flex-wrap items-center gap-4 p-3">
        {startTime && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">{startTime}</span>
          </div>
        )}

        {duration && (
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">{duration}</span>
          </div>
        )}

        {rating != null && (
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
            <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
            {reviewCount != null && (
              <span className="text-sm text-muted-foreground">({reviewCount})</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
