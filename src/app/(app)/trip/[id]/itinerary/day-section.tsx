'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DraggableTimelineItem } from './draggable-timeline-item';
import { TimelineActivityItem } from './timeline-activity-item';
import { EmptyDayState } from './empty-day-state';
import type { ActivityWithCreator } from '@/lib/supabase/activities';

interface DaySectionProps {
  date: string;
  dayNumber: number;
  activities: ActivityWithCreator[];
  onAddActivity: (date: string) => void;
  onActivityClick: (activity: ActivityWithCreator) => void;
  draggable?: boolean;
}

function getRelativeDayLabel(date: Date): string | null {
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  if (isYesterday(date)) return 'Ontem';
  return null;
}

export function DaySection({
  date,
  dayNumber,
  activities,
  onAddActivity,
  onActivityClick,
  draggable = true,
}: DaySectionProps) {
  const dateObj = new Date(date + 'T00:00:00');
  const relativeLabel = getRelativeDayLabel(dateObj);
  const hasActivities = activities.length > 0;
  const isOutOfRange = dayNumber <= 0;
  const dayLabel = isOutOfRange ? 'Extra' : `Dia ${dayNumber}`;

  const { setNodeRef, isOver } = useDroppable({
    id: date,
    data: { type: 'day', date },
  });

  const activityIds = activities.map((a) => a.id);

  return (
    <section className="flex min-h-0 flex-col">
      {/* Day Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{dayLabel}</h2>
            <span className="text-sm text-muted-foreground capitalize">
              {format(dateObj, 'EEEE', { locale: ptBR })}
            </span>
            {relativeLabel && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {relativeLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {format(dateObj, "d 'de' MMMM", { locale: ptBR })} • {activities.length}{' '}
            {activities.length === 1 ? 'atividade' : 'atividades'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-11 min-w-[44px] sm:h-8 sm:min-w-0"
          onClick={() => onAddActivity(date)}
        >
          <Plus className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">Adicionar</span>
        </Button>
      </div>

      {/* Timeline Content - Droppable Container */}
      <div
        ref={setNodeRef}
        className={`min-h-[80px] flex-1 transition-colors ${
          isOver ? 'rounded-lg bg-primary/5' : ''
        }`}
      >
        <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
          {hasActivities ? (
            <div className="space-y-0">
              {activities.map((activity, index) =>
                draggable ? (
                  <DraggableTimelineItem
                    key={activity.id}
                    activity={activity}
                    isFirst={index === 0}
                    isLast={index === activities.length - 1}
                    onClick={onActivityClick}
                  />
                ) : (
                  <TimelineActivityItem
                    key={activity.id}
                    activity={activity}
                    isFirst={index === 0}
                    isLast={index === activities.length - 1}
                    onClick={onActivityClick}
                  />
                )
              )}
            </div>
          ) : (
            <EmptyDayState dayNumber={dayNumber} onAddActivity={() => onAddActivity(date)} />
          )}
        </SortableContext>
      </div>
    </section>
  );
}
