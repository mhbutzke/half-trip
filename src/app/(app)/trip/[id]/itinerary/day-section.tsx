'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Sunrise, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DraggableActivityCard } from './draggable-activity-card';
import type { ActivityWithCreator } from '@/lib/supabase/activities';

interface DaySectionProps {
  date: string;
  dayNumber: number;
  activities: ActivityWithCreator[];
  onAddActivity: (date: string) => void;
  onEditActivity: (activity: ActivityWithCreator) => void;
  onDeleteActivity: (activity: ActivityWithCreator) => void;
  onSyncActivity: (activity: ActivityWithCreator) => void;
  syncingActivityId?: string | null;
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
  onEditActivity,
  onDeleteActivity,
  onSyncActivity,
  syncingActivityId = null,
}: DaySectionProps) {
  const dateObj = new Date(date + 'T00:00:00');
  const relativeLabel = getRelativeDayLabel(dateObj);
  const hasActivities = activities.length > 0;

  // Make the day a droppable container
  const { setNodeRef, isOver } = useDroppable({
    id: date,
    data: {
      type: 'day',
      date,
    },
  });

  // Get activity IDs for sortable context
  const activityIds = activities.map((a) => a.id);

  return (
    <div className="relative">
      {/* Day Header */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:-mx-0 sm:px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="text-lg font-bold">{dayNumber}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold capitalize">
                  {format(dateObj, 'EEEE', { locale: ptBR })}
                </h2>
                {relativeLabel && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {relativeLabel}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {format(dateObj, "d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" className="h-9" onClick={() => onAddActivity(date)}>
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Activities List - Droppable Container */}
      <div
        ref={setNodeRef}
        className={`mt-4 min-h-[60px] space-y-3 pl-8 transition-colors sm:pl-10 ${
          isOver ? 'rounded-lg bg-primary/5' : ''
        }`}
      >
        <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
          {hasActivities ? (
            activities.map((activity) => (
              <DraggableActivityCard
                key={activity.id}
                activity={activity}
                onEdit={onEditActivity}
                onDelete={onDeleteActivity}
                onSync={onSyncActivity}
                isSyncing={syncingActivityId === activity.id}
              />
            ))
          ) : (
            <div className="-ml-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center sm:-ml-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                {dayNumber === 1 ? (
                  <Sunrise className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="mt-3 text-sm font-medium">Nenhuma atividade</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicione atividades para este dia
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => onAddActivity(date)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar atividade
              </Button>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
