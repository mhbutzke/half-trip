'use client';

import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MapPin, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getCategoryInfo, formatTime } from '@/lib/utils/activity-categories';
import { transportTypeMap } from '@/lib/utils/transport-types';
import { cn } from '@/lib/utils';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { ActivityMetadata } from '@/types/database';
import type { ActivityTimingStatus } from '@/lib/utils/activity-timing';

interface DraggableTimelineItemProps {
  activity: ActivityWithCreator;
  isFirst: boolean;
  isLast: boolean;
  onClick: (activity: ActivityWithCreator) => void;
  isDragOverlay?: boolean;
  timingStatus?: ActivityTimingStatus | null;
}

export function DraggableTimelineItem({
  activity,
  isFirst,
  isLast,
  onClick,
  isDragOverlay = false,
  timingStatus,
}: DraggableTimelineItemProps) {
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

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    data: {
      type: 'activity',
      activity,
    },
    disabled: isDragOverlay,
  });

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      className="group/item relative flex items-start gap-3 py-2.5 touch-manipulation"
    >
      {/* Time column */}
      <div className="w-16 flex-shrink-0 pt-0.5 text-center">
        {timeDisplay ? (
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {timeDisplay}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">--:--</span>
        )}
      </div>

      {/* Timeline node + line */}
      <div className="relative flex flex-col items-center">
        <div
          className={`w-px flex-1 min-h-2 ${isFirst ? 'bg-transparent' : 'border-l-2 border-dashed border-muted-foreground/20'}`}
        />
        <div
          className={cn(
            'relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-2 ring-background transition-all',
            categoryInfo.bgColor,
            timingStatus === 'now' &&
              'ring-primary ring-4 shadow-[0_0_12px_hsl(var(--primary)/0.5)] animate-pulse',
            timingStatus === 'next' && 'ring-primary/50 ring-4'
          )}
        >
          <CategoryIcon className={`h-5 w-5 ${categoryInfo.color}`} aria-hidden="true" />
        </div>
        <div
          className={`w-px flex-1 min-h-2 ${isLast ? 'bg-transparent' : 'border-l-2 border-dashed border-muted-foreground/20'}`}
        />
      </div>

      {/* Content - clickable area */}
      <div
        className="min-w-0 flex-1 cursor-pointer rounded-md px-2 py-1 transition-colors hover:bg-accent/50"
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
        <div className="flex items-start justify-between gap-2 w-full">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
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
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{activity.location}</span>
              </div>
            )}
            {(activity.expense_count ?? 0) > 0 && (
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
                <DollarSign className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span>
                  {activity.expense_count} despesa{activity.expense_count! > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          {/* Creator avatar */}
          <Avatar className="size-6 flex-shrink-0">
            {activity.users.avatar_url ? (
              <AvatarImage src={activity.users.avatar_url} alt={activity.users.name} />
            ) : null}
            <AvatarFallback className="text-[10px] bg-muted">
              {activity.users.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex h-11 w-11 flex-shrink-0 cursor-grab items-center justify-center rounded opacity-100 transition-opacity hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover/item:opacity-100 active:cursor-grabbing"
        aria-label="Arrastar atividade"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
