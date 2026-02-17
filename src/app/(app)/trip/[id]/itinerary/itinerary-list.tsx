'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { MapPin, Plus, Plane, Search, X, Map, List } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FAB } from '@/components/ui/fab';
import { DaySection } from './day-section';
import { DayCarousel } from './day-carousel';
import { DraggableTimelineItem } from './draggable-timeline-item';
import { ActivityDetailSheet } from './activity-detail-sheet';
import { reorderActivities } from '@/lib/supabase/activities';
import { useTripRealtime } from '@/hooks/use-trip-realtime';
import { activityCategoryList } from '@/lib/utils/activity-categories';
import { computeActivityTimingMap } from '@/lib/utils/activity-timing';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { Activity, ActivityCategory } from '@/types/database';
import type { TripParticipantResolved } from '@/lib/supabase/participants';

const DeleteActivityDialog = dynamic(
  () => import('./delete-activity-dialog').then((mod) => ({ default: mod.DeleteActivityDialog })),
  { ssr: false }
);
const AddActivityDialog = dynamic(
  () =>
    import('@/components/activities/add-activity-dialog').then((mod) => ({
      default: mod.AddActivityDialog,
    })),
  { ssr: false }
);
const EditActivityDialog = dynamic(
  () =>
    import('@/components/activities/edit-activity-dialog').then((mod) => ({
      default: mod.EditActivityDialog,
    })),
  { ssr: false }
);
const FlightSearchDialog = dynamic(
  () =>
    import('@/components/activities/flight-search-dialog').then((mod) => ({
      default: mod.FlightSearchDialog,
    })),
  { ssr: false }
);
const AddExpenseDialog = dynamic(
  () =>
    import('@/components/expenses/add-expense-dialog').then((mod) => ({
      default: mod.AddExpenseDialog,
    })),
  { ssr: false }
);
const TripActivityMap = dynamic(
  () =>
    import('@/components/maps/trip-activity-map').then((mod) => ({
      default: mod.TripActivityMap,
    })),
  { ssr: false }
);

interface ItineraryListProps {
  tripId: string;
  startDate: string;
  endDate: string;
  initialActivities: ActivityWithCreator[];
  userRole: 'organizer' | 'participant' | null;
  googleCalendarConnected: boolean;
  currentUserId?: string;
  transportType?: string;
  participants?: TripParticipantResolved[];
  currentParticipantId?: string;
  baseCurrency?: string;
}

export function ItineraryList({
  tripId,
  startDate,
  endDate,
  initialActivities,
  googleCalendarConnected,
  currentUserId,
  transportType = 'plane',
  participants = [],
  currentParticipantId,
  baseCurrency = 'BRL',
}: ItineraryListProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityWithCreator[]>(initialActivities);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<ActivityWithCreator | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [syncingActivityId, setSyncingActivityId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Activity detail sheet state
  const [viewingActivity, setViewingActivity] = useState<ActivityWithCreator | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  // Expense dialog state (linked to activity)
  const [expenseActivity, setExpenseActivity] = useState<ActivityWithCreator | null>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

  // Carousel state
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Activity timing (Agora/Próxima indicators)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  const activityTimingMap = useMemo(
    () => computeActivityTimingMap(activities, now),
    [activities, now]
  );

  useTripRealtime({ tripId });

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Generate all days in the trip range
  const tripDays = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return eachDayOfInterval({ start, end }).map((date) => format(date, 'yyyy-MM-dd'));
  }, [startDate, endDate]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isFilteredView = normalizedSearch.length > 0 || categoryFilter !== 'all';

  const visibleActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (categoryFilter !== 'all' && activity.category !== categoryFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const fields = [activity.title, activity.location || '', activity.description || ''].map(
        (value) => value.toLowerCase()
      );
      return fields.some((value) => value.includes(normalizedSearch));
    });
  }, [activities, categoryFilter, normalizedSearch]);

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    const grouped: Record<string, ActivityWithCreator[]> = {};

    tripDays.forEach((date) => {
      grouped[date] = [];
    });

    visibleActivities.forEach((activity) => {
      if (grouped[activity.date]) {
        grouped[activity.date].push(activity);
      } else {
        grouped[activity.date] = [activity];
      }
    });

    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        if (a.start_time && b.start_time) {
          return a.start_time.localeCompare(b.start_time);
        }
        if (a.start_time) return -1;
        if (b.start_time) return 1;
        return 0;
      });
    });

    return grouped;
  }, [visibleActivities, tripDays]);

  // Get all dates
  const allDates = useMemo(() => {
    const dates = new Set<string>();
    if (!isFilteredView) {
      tripDays.forEach((date) => dates.add(date));
      activities.forEach((activity) => {
        dates.add(activity.date);
      });
    } else {
      visibleActivities.forEach((activity) => {
        dates.add(activity.date);
      });
    }
    return Array.from(dates).sort();
  }, [tripDays, activities, visibleActivities, isFilteredView]);

  // Initialize active day to "today" if in range
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayIndex = allDates.indexOf(today);
    if (todayIndex >= 0) {
      setActiveDayIndex(todayIndex);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeActivity = useMemo(() => {
    if (!activeId) return null;
    return visibleActivities.find((a) => a.id === activeId) || null;
  }, [activeId, visibleActivities]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeActivity = activities.find((a) => a.id === activeId);
      if (!activeActivity) return;

      const isOverDay = allDates.includes(overId);

      if (isOverDay) {
        const overDate = overId;
        if (activeActivity.date === overDate) return;
        setActivities((prev) =>
          prev.map((activity) =>
            activity.id === activeId ? { ...activity, date: overDate } : activity
          )
        );
        return;
      }

      const overActivity = activities.find((a) => a.id === overId);
      if (!overActivity) return;

      if (activeActivity.date !== overActivity.date) {
        setActivities((prev) =>
          prev.map((activity) =>
            activity.id === activeId ? { ...activity, date: overActivity.date } : activity
          )
        );
      }
    },
    [activities, allDates]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const draggedActivity = activities.find((a) => a.id === activeId);
      if (!draggedActivity) return;

      const currentDate = draggedActivity.date;
      const dayActivities = activitiesByDate[currentDate] || [];
      const oldIndex = dayActivities.findIndex((a) => a.id === activeId);

      const overActivity = dayActivities.find((a) => a.id === overId);
      let newActivities = [...activities];

      if (overActivity && oldIndex !== -1) {
        const newIndex = dayActivities.findIndex((a) => a.id === overId);
        if (oldIndex !== newIndex) {
          const reorderedDay = arrayMove(dayActivities, oldIndex, newIndex);
          const reorderedWithSortOrder = reorderedDay.map((activity, index) => ({
            ...activity,
            sort_order: index,
          }));
          newActivities = activities.filter((a) => a.date !== currentDate);
          newActivities = [...newActivities, ...reorderedWithSortOrder];
          newActivities.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.sort_order - b.sort_order;
          });
          setActivities(newActivities);
        }
      } else if (allDates.includes(overId)) {
        const targetDate = overId;
        const targetDayActivities = activitiesByDate[targetDate] || [];
        const updatedTargetDay = targetDayActivities.map((activity, index) => ({
          ...activity,
          sort_order: index,
        }));
        newActivities = activities.filter((a) => a.date !== targetDate);
        newActivities = [...newActivities, ...updatedTargetDay];
        newActivities.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.sort_order - b.sort_order;
        });
        setActivities(newActivities);
      }

      const updates = newActivities.map((activity) => ({
        activityId: activity.id,
        date: activity.date,
        sort_order: activity.sort_order,
      }));

      const result = await reorderActivities(tripId, updates);
      if (result.error) {
        toast.error('Erro ao reorganizar atividades', { description: result.error });
        setActivities(initialActivities);
      } else {
        toast.success('Atividades reorganizadas');
      }
    },
    [activities, activitiesByDate, allDates, tripId, initialActivities]
  );

  // Activity interaction handlers
  const handleActivityClick = useCallback((activity: ActivityWithCreator) => {
    setViewingActivity(activity);
    setIsDetailSheetOpen(true);
  }, []);

  const handleAddActivity = (date: string) => {
    setSelectedDate(date);
    setIsAddDialogOpen(true);
  };

  const handleEditActivity = (activity: ActivityWithCreator) => {
    setEditingActivity(activity);
    setIsEditDialogOpen(true);
  };

  const handleDeleteActivity = (activity: ActivityWithCreator) => {
    setDeletingActivity(activity);
    setIsDeleteDialogOpen(true);
  };

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    setSelectedDate(null);
    router.refresh();
  };

  const handleAddDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) setSelectedDate(null);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingActivity(null);
    router.refresh();
  };

  const handleDeleteSuccess = () => {
    setIsDeleteDialogOpen(false);
    setDeletingActivity(null);
    router.refresh();
  };

  const syncActivitiesToGoogle = useCallback(
    async (activityIds?: string[]) => {
      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, activityIds }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        reconnectRequired?: boolean;
        created?: number;
        updated?: number;
        failed?: number;
      } | null;

      if (!response.ok) {
        if (payload?.reconnectRequired) {
          toast.error(payload.error || 'Reconecte sua conta Google para sincronizar.');
          router.push('/settings');
          return;
        }
        toast.error(payload?.error || 'Erro ao sincronizar Google Agenda');
        return;
      }

      const totalSynced = (payload?.created || 0) + (payload?.updated || 0);
      if (activityIds && activityIds.length === 1) {
        if (totalSynced > 0) {
          toast.success('Atividade sincronizada na agenda');
        } else {
          toast.error('Não foi possível sincronizar a atividade');
        }
        return;
      }

      toast.success('Sincronização concluída', {
        description: `${payload?.created || 0} criadas, ${payload?.updated || 0} atualizadas${payload?.failed ? `, ${payload.failed} falhas` : ''}.`,
      });
    },
    [tripId, router]
  );

  const handleSyncActivity = useCallback(
    async (activity: ActivityWithCreator) => {
      if (!googleCalendarConnected) {
        window.location.assign(
          `/api/google-calendar/connect?redirect=${encodeURIComponent(`/trip/${tripId}/itinerary`)}`
        );
        return;
      }
      setSyncingActivityId(activity.id);
      try {
        await syncActivitiesToGoogle([activity.id]);
      } finally {
        setSyncingActivityId(null);
      }
    },
    [googleCalendarConnected, tripId, syncActivitiesToGoogle]
  );

  // Stats
  const totalActivities = activities.length;
  const visibleActivitiesCount = visibleActivities.length;
  const defaultActivityDate = useMemo(() => {
    // Use the currently active carousel day as default
    if (allDates[activeDayIndex]) return allDates[activeDayIndex];
    const today = format(new Date(), 'yyyy-MM-dd');
    return tripDays.includes(today) ? today : tripDays[0];
  }, [tripDays, allDates, activeDayIndex]);

  if (tripDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-semibold">Datas da viagem não definidas</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure as datas da viagem para começar a planejar o roteiro.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Search, Filters & Actions */}
      <div className="space-y-3 rounded-lg border bg-muted/20 p-3 sm:p-4">
        {/* Search bar */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Buscar no roteiro..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-11 flex-shrink-0 sm:h-9"
            onClick={() => setCategoryFilter('all')}
          >
            Todas
          </Button>
          {activityCategoryList.map((category) => (
            <Button
              key={category.value}
              variant={categoryFilter === category.value ? 'default' : 'outline'}
              size="sm"
              className="h-11 flex-shrink-0 sm:h-9"
              onClick={() => setCategoryFilter(category.value)}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            className="h-11 sm:h-9"
            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            aria-label={viewMode === 'map' ? 'Ver como lista' : 'Ver no mapa'}
          >
            {viewMode === 'map' ? (
              <List className="mr-2 h-4 w-4" />
            ) : (
              <Map className="mr-2 h-4 w-4" />
            )}
            <span>{viewMode === 'map' ? 'Lista' : 'Mapa'}</span>
          </Button>
          {isFilteredView && (
            <div className="mr-auto text-xs text-muted-foreground">
              {visibleActivitiesCount} de {totalActivities} atividades
            </div>
          )}
          {(transportType === 'plane' || transportType === 'mixed') && (
            <FlightSearchDialog
              tripId={tripId}
              onSuccess={handleAddSuccess}
              trigger={
                <Button variant="outline" size="sm" className="h-11 sm:h-9">
                  <Plane className="mr-2 h-4 w-4" />
                  Voo
                </Button>
              }
            />
          )}
          <AddActivityDialog
            tripId={tripId}
            defaultDate={defaultActivityDate}
            trigger={
              <Button size="sm" className="hidden md:flex h-11 sm:h-9">
                <Plus className="mr-2 h-4 w-4" />
                Nova atividade
              </Button>
            }
            onSuccess={handleAddSuccess}
          />
        </div>
      </div>

      {viewMode === 'map' ? (
        /* Map View */
        <TripActivityMap
          activities={visibleActivities}
          tripDays={tripDays}
          onActivitySelect={(a) => handleActivityClick(a as ActivityWithCreator)}
          className="h-[calc(100vh-16rem)] min-h-[400px] md:h-[calc(100vh-20rem)]"
        />
      ) : (
        <>
          {isFilteredView && (
            <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Reordenação por arrastar está desativada enquanto filtros/busca estiverem ativos.
            </div>
          )}

          {allDates.length === 0 && isFilteredView && (
            <div className="rounded-lg border border-dashed py-10 text-center">
              <p className="text-sm font-medium">
                Nenhuma atividade encontrada para o filtro atual.
              </p>
              <Button
                className="mt-3 h-11 sm:h-9"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}

          {/* Day Carousel with Timeline */}
          {allDates.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <DayCarousel
                dates={allDates}
                tripDays={tripDays}
                activitiesByDate={activitiesByDate}
                activeIndex={activeDayIndex}
                onDayChange={setActiveDayIndex}
              >
                {allDates.map((date) => {
                  const dayNumber = tripDays.indexOf(date) + 1;
                  const isOutOfRange = !tripDays.includes(date);

                  return (
                    <DaySection
                      key={date}
                      date={date}
                      dayNumber={isOutOfRange ? 0 : dayNumber}
                      activities={activitiesByDate[date] || []}
                      onAddActivity={handleAddActivity}
                      onActivityClick={handleActivityClick}
                      draggable={!isFilteredView}
                      activityTimingMap={activityTimingMap}
                    />
                  );
                })}
              </DayCarousel>

              {/* Drag Overlay */}
              <DragOverlay>
                {!isFilteredView && activeActivity ? (
                  <div className="w-full max-w-sm rounded-lg border bg-background p-2 shadow-lg">
                    <DraggableTimelineItem
                      activity={activeActivity}
                      isFirst
                      isLast
                      onClick={() => {}}
                      isDragOverlay
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      )}

      {/* Activity Detail Sheet */}
      <ActivityDetailSheet
        activity={viewingActivity}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        onEdit={(activity) => {
          setIsDetailSheetOpen(false);
          handleEditActivity(activity);
        }}
        onDelete={(activity) => {
          setIsDetailSheetOpen(false);
          handleDeleteActivity(activity);
        }}
        onSync={handleSyncActivity}
        isSyncing={syncingActivityId === viewingActivity?.id}
        onAddExpense={
          participants.length > 0
            ? (activity) => {
                setExpenseActivity(activity);
                setIsExpenseDialogOpen(true);
              }
            : undefined
        }
      />

      {/* Add Activity Dialog */}
      <AddActivityDialog
        tripId={tripId}
        defaultDate={selectedDate || defaultActivityDate}
        open={isAddDialogOpen}
        onOpenChange={handleAddDialogChange}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Activity Dialog */}
      <EditActivityDialog
        activity={editingActivity}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Activity Dialog */}
      <DeleteActivityDialog
        activity={deletingActivity}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      {/* Add Expense Dialog (linked to activity) */}
      {currentUserId && currentParticipantId && expenseActivity && (
        <AddExpenseDialog
          tripId={tripId}
          participants={participants}
          currentUserId={currentUserId}
          currentParticipantId={currentParticipantId}
          baseCurrency={baseCurrency}
          open={isExpenseDialogOpen}
          onOpenChange={(open) => {
            setIsExpenseDialogOpen(open);
            if (!open) setExpenseActivity(null);
          }}
          defaultDescription={expenseActivity.title}
          defaultActivityId={expenseActivity.id}
          onSuccess={() => {
            setIsExpenseDialogOpen(false);
            setExpenseActivity(null);
            router.refresh();
          }}
        />
      )}

      {/* Mobile FAB */}
      <FAB
        icon={Plus}
        label="Adicionar atividade"
        onClick={() => {
          setSelectedDate(defaultActivityDate);
          setIsAddDialogOpen(true);
        }}
      />
    </>
  );
}
