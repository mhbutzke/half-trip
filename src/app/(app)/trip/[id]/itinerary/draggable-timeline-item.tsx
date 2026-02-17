'use client';

import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MapPin, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getCategoryInfo, formatTime, formatDuration } from '@/lib/utils/activity-categories';
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
  const durationDisplay = formatDuration(activity.duration_minutes);

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
      className="group/item relative pb-3 last:pb-0 touch-manipulation"
    >
      {/* Timeline dot */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-[22px] z-10 h-2 w-2 -translate-x-[3.5px] rounded-full ring-2 ring-background',
          categoryInfo.dotColor,
          timingStatus === 'now' &&
            'h-2.5 w-2.5 -translate-x-[4.25px] ring-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.5)]',
          timingStatus === 'next' && 'ring-primary/50'
        )}
      />

      {/* Time label + badges */}
      <div className="mb-1 flex items-center gap-2 pl-4">
        {timeDisplay ? (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              timingStatus === 'now' ? 'text-primary font-semibold' : 'text-muted-foreground'
            )}
          >
            {timeDisplay}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">--:--</span>
        )}
        {timingStatus === 'now' && (
          <Badge variant="default" className="h-4 px-1.5 text-[10px] animate-pulse">
            Agora
          </Badge>
        )}
        {timingStatus === 'next' && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            Próxima
          </Badge>
        )}
      </div>

      {/* Card */}
      <div
        className={cn(
          'relative ml-4 overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md',
          'border-l-4',
          categoryInfo.borderColor,
          timingStatus === 'now' && 'shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]'
        )}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            'absolute right-1.5 top-1.5 z-20',
            'flex h-11 w-11 items-center justify-center rounded',
            'cursor-grab active:cursor-grabbing touch-manipulation',
            'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50',
            'sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover/item:opacity-100',
            'transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label="Arrastar atividade"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Clickable content area */}
        <div
          className="p-3 pr-10 cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => onClick(activity)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick(activity);
            }
          }}
          aria-label={`${activity.title}${activity.location ? ` em ${activity.location}` : ''}`}
        >
          <div className="flex items-start gap-2">
            {/* Inline category icon */}
            <CategoryIcon
              className={cn('mt-0.5 h-4 w-4 flex-shrink-0', categoryInfo.color)}
              aria-hidden="true"
            />

            {/* Content */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-snug">{activity.title}</h3>

              {/* Metadata row */}
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                {activity.location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate max-w-[180px]">{activity.location}</span>
                  </span>
                )}
                {durationDisplay && (
                  <span className="text-xs text-muted-foreground">{durationDisplay}</span>
                )}
                {(activity.expense_count ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    {activity.expense_count} despesa{activity.expense_count! > 1 ? 's' : ''}
                  </span>
                )}
              </div>
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
    </div>
  );
}
