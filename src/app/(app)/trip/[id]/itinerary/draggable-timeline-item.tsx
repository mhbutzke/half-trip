'use client';

import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MapPin } from 'lucide-react';
import { getCategoryInfo, formatTime } from '@/lib/utils/activity-categories';
import { transportTypeMap } from '@/lib/utils/transport-types';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { ActivityMetadata } from '@/types/database';

interface DraggableTimelineItemProps {
  activity: ActivityWithCreator;
  isFirst: boolean;
  isLast: boolean;
  onClick: (activity: ActivityWithCreator) => void;
  isDragOverlay?: boolean;
}

export function DraggableTimelineItem({
  activity,
  isFirst,
  isLast,
  onClick,
  isDragOverlay = false,
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
      className="group/item relative flex items-start gap-3 py-2 touch-manipulation"
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
        <div
          className={`w-px flex-1 min-h-2 ${isFirst ? 'bg-transparent' : 'border-l-2 border-dashed border-muted-foreground/20'}`}
        />
        <div
          className={`relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${categoryInfo.bgColor} ring-2 ring-background`}
        >
          <CategoryIcon className={`h-4 w-4 ${categoryInfo.color}`} aria-hidden="true" />
        </div>
        <div
          className={`w-px flex-1 min-h-2 ${isLast ? 'bg-transparent' : 'border-l-2 border-dashed border-muted-foreground/20'}`}
        />
      </div>

      {/* Content - clickable area */}
      <div
        className="min-w-0 flex-1 pt-1 cursor-pointer rounded-md px-1.5 py-0.5 transition-colors hover:bg-accent/50"
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
        <h3 className="text-sm font-medium leading-tight line-clamp-1">{activity.title}</h3>
        {activity.location && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{activity.location}</span>
          </div>
        )}
      </div>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-2 flex-shrink-0 cursor-grab rounded p-1 opacity-100 transition-opacity hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/item:opacity-100 active:cursor-grabbing"
        aria-label="Arrastar atividade"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
