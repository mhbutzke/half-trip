'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryIcon, formatDuration, formatTime } from '@/lib/utils/activity-categories';
import type { Activity, ActivityMetadata } from '@/types/database';

interface DayTimelineProps {
  activities: Activity[];
  date: string;
  onActivityClick?: (activity: Activity) => void;
  className?: string;
}

export function DayTimeline({
  activities,
  date: _date,
  onActivityClick,
  className,
}: DayTimelineProps) {
  // Sort activities by time
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0;
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [activities]);

  // Check for time conflicts
  const hasConflict = (index: number): boolean => {
    const current = sortedActivities[index];
    if (!current.start_time || !current.duration_minutes) return false;

    const currentStart = timeToMinutes(current.start_time);
    const currentEnd = currentStart + current.duration_minutes;

    for (let i = 0; i < sortedActivities.length; i++) {
      if (i === index) continue;

      const other = sortedActivities[i];
      if (!other.start_time || !other.duration_minutes) continue;

      const otherStart = timeToMinutes(other.start_time);
      const otherEnd = otherStart + other.duration_minutes;

      // Check overlap
      if (currentStart < otherEnd && currentEnd > otherStart) {
        return true;
      }
    }

    return false;
  };

  if (activities.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="relative space-y-0">
          {sortedActivities.map((activity, index) => {
            const Icon = getCategoryIcon(
              activity.category,
              activity.metadata as ActivityMetadata | null
            );
            const isConflict = hasConflict(index);
            const isLast = index === sortedActivities.length - 1;

            return (
              <div key={activity.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-[19px] top-10 h-[calc(100%+8px)] w-0.5',
                      isConflict ? 'bg-destructive/50' : 'bg-border'
                    )}
                  />
                )}

                {/* Activity item */}
                <button
                  type="button"
                  onClick={() => onActivityClick?.(activity)}
                  className={cn(
                    'group relative flex w-full gap-4 rounded-lg p-2 text-left transition-colors',
                    'hover:bg-muted/50',
                    isConflict && 'bg-destructive/5'
                  )}
                >
                  {/* Time indicator */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
                        isConflict
                          ? 'border-destructive bg-destructive/10'
                          : 'border-primary bg-primary/10'
                      )}
                    >
                      <Icon
                        className={cn('h-5 w-5', isConflict ? 'text-destructive' : 'text-primary')}
                      />
                    </div>
                    {activity.start_time && (
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {formatTime(activity.start_time)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm truncate">{activity.title}</h4>
                      {activity.duration_minutes && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatDuration(activity.duration_minutes)}
                        </Badge>
                      )}
                    </div>

                    {activity.location && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{activity.location}</span>
                      </div>
                    )}

                    {isConflict && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        ⚠️ Conflito de horário
                      </Badge>
                    )}

                    {activity.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to convert time string (HH:MM) to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
