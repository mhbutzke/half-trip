'use client';

import { memo, useMemo } from 'react';
import { MapPin, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getCategoryInfo } from '@/lib/utils/activity-categories';
import { transportTypeMap } from '@/lib/utils/transport-types';
import { formatTime } from '@/lib/utils/activity-categories';
import { cn } from '@/lib/utils';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { ActivityMetadata } from '@/types/database';
import type { ActivityTimingStatus } from '@/lib/utils/activity-timing';

interface TimelineActivityItemProps {
  activity: ActivityWithCreator;
  isFirst: boolean;
  isLast: boolean;
  onClick: (activity: ActivityWithCreator) => void;
  timingStatus?: ActivityTimingStatus | null;
}

export const TimelineActivityItem = memo(function TimelineActivityItem({
  activity,
  isFirst,
  isLast,
  onClick,
  timingStatus,
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
          className={cn(
            'relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ring-2 ring-background transition-transform group-hover/item:scale-110',
            categoryInfo.bgColor,
            timingStatus === 'now' &&
              'ring-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)] animate-pulse',
            timingStatus === 'next' && 'ring-primary/50'
          )}
        >
          <CategoryIcon className={`h-4 w-4 ${categoryInfo.color}`} aria-hidden="true" />
        </div>

        {/* Bottom line segment */}
        <div
          className={`w-px flex-1 min-h-2 ${isLast ? 'bg-transparent' : 'border-l-2 border-dashed border-muted-foreground/20'}`}
        />
      </div>

      {/* Content */}
      <div className="relative min-w-0 flex-1 pt-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium leading-tight line-clamp-1">{activity.title}</h3>
              {timingStatus === 'now' && (
                <Badge
                  variant="default"
                  className="text-[10px] px-1.5 py-0 h-4 animate-pulse flex-shrink-0"
                >
                  Agora
                </Badge>
              )}
              {timingStatus === 'next' && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                  Próxima
                </Badge>
              )}
            </div>
            {activity.location && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{activity.location}</span>
              </div>
            )}
            {(activity.expense_count ?? 0) > 0 && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-emerald-500">
                <DollarSign className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span>
                  {activity.expense_count} despesa{activity.expense_count! > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          {/* Creator avatar */}
          <Avatar className="size-5 flex-shrink-0 mt-0.5">
            {activity.users.avatar_url ? (
              <AvatarImage src={activity.users.avatar_url} alt={activity.users.name} />
            ) : null}
            <AvatarFallback className="text-[9px] bg-muted">
              {activity.users.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
});
