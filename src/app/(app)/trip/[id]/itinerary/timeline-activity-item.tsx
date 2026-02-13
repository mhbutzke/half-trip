'use client';

import { memo, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { getCategoryInfo } from '@/lib/utils/activity-categories';
import { transportTypeMap } from '@/lib/utils/transport-types';
import { formatTime } from '@/lib/utils/activity-categories';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { ActivityMetadata } from '@/types/database';

interface TimelineActivityItemProps {
  activity: ActivityWithCreator;
  isFirst: boolean;
  isLast: boolean;
  onClick: (activity: ActivityWithCreator) => void;
}

export const TimelineActivityItem = memo(function TimelineActivityItem({
  activity,
  isFirst,
  isLast,
  onClick,
}: TimelineActivityItemProps) {
  const meta = activity.metadata as ActivityMetadata | null;
  const categoryInfo = getCategoryInfo(activity.category);

  const CategoryIcon = useMemo(() => {
    if (activity.category === 'transport' && meta?.transport_type) {
      const transportInfo = transportTypeMap[meta.transport_type];
      if (transportInfo) return transportInfo.icon;
    }
    return categoryInfo.icon;
  }, [activity.category, meta?.transport_type, categoryInfo.icon]);

  const timeDisplay = formatTime(activity.start_time);

  return (
    <div
      className="group/item relative flex cursor-pointer items-start gap-3 py-2 transition-colors hover:bg-accent/50 rounded-lg px-1 -mx-1"
      onClick={() => onClick(activity)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(activity);
        }
      }}
      aria-label={`${activity.title}${activity.location ? ` em ${activity.location}` : ''}`}
    >
      {/* Time column */}
      <div className="w-14 flex-shrink-0 pt-1.5 text-right">
        {timeDisplay ? (
          <span className="text-sm font-medium text-muted-foreground">{timeDisplay}</span>
        ) : (
          <span className="text-xs text-muted-foreground/50">--:--</span>
        )}
      </div>

      {/* Timeline node + line */}
      <div className="relative flex flex-col items-center">
        {/* Top line segment */}
        <div
          className={`w-px flex-1 min-h-2 ${isFirst ? 'bg-transparent' : 'border-l-2 border-dashed border-muted-foreground/20'}`}
        />

        {/* Node (category icon) */}
        <div
          className={`relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${categoryInfo.bgColor} ring-2 ring-background transition-transform group-hover/item:scale-110`}
        >
          <CategoryIcon className={`h-4 w-4 ${categoryInfo.color}`} aria-hidden="true" />
        </div>

        {/* Bottom line segment */}
        <div
          className={`w-px flex-1 min-h-2 ${isLast ? 'bg-transparent' : 'border-l-2 border-dashed border-muted-foreground/20'}`}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-1">
        <h3 className="text-sm font-medium leading-tight line-clamp-1">{activity.title}</h3>
        {activity.location && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{activity.location}</span>
          </div>
        )}
      </div>
    </div>
  );
});
