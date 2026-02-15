'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTripActivitiesByDate, getTripActivitiesIndex } from '@/lib/supabase/activities';
import { routes } from '@/lib/routes';
import type { Activity } from '@/types/database';
import type { ActivityWithCreator } from '@/lib/supabase/activities';

import { DayCarousel } from '@/app/(app)/trip/[id]/itinerary/day-carousel';
import { TimelineActivityItem } from '@/app/(app)/trip/[id]/itinerary/timeline-activity-item';
import { ActivityDetailSheet } from '@/app/(app)/trip/[id]/itinerary/activity-detail-sheet';

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
const DeleteActivityDialog = dynamic(
  () =>
    import('@/app/(app)/trip/[id]/itinerary/delete-activity-dialog').then((mod) => ({
      default: mod.DeleteActivityDialog,
    })),
  { ssr: false }
);

type TripItineraryPreviewProps = {
  tripId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  userRole: 'organizer' | 'participant' | null;
  googleCalendarConnected?: boolean;
  initialIndex?: Record<string, number>;
  onRegisterAdd?: (open: (date?: string) => void) => void;
};

export function TripItineraryPreview({
  tripId,
  startDate,
  endDate,
  googleCalendarConnected,
  initialIndex,
  onRegisterAdd,
}: TripItineraryPreviewProps) {
  const router = useRouter();

  const tripDays = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
  }, [startDate, endDate]);

  const initialActiveIndex = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayIndex = tripDays.indexOf(today);
    return todayIndex >= 0 ? todayIndex : 0;
  }, [tripDays]);

  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const activeDate = tripDays[activeIndex] || tripDays[0];

  const [indexByDate, setIndexByDate] = useState<Record<string, number>>(initialIndex ?? {});
  const [isIndexLoading, setIsIndexLoading] = useState(!initialIndex);

  const [activitiesByDate, setActivitiesByDate] = useState<Record<string, ActivityWithCreator[]>>(
    {}
  );
  const [loadingDates, setLoadingDates] = useState<Record<string, boolean>>({});

  // Dialog/sheet state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [viewingActivity, setViewingActivity] = useState<ActivityWithCreator | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deletingActivity, setDeletingActivity] = useState<ActivityWithCreator | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [syncingActivityId, setSyncingActivityId] = useState<string | null>(null);

  const loadIndex = useCallback(async () => {
    setIsIndexLoading(true);
    try {
      const idx = await getTripActivitiesIndex(tripId);
      setIndexByDate(idx);
    } catch {
      toast.error('Erro ao carregar índice do roteiro');
    } finally {
      setIsIndexLoading(false);
    }
  }, [tripId]);

  const loadDate = useCallback(
    async (date: string) => {
      if (!date) return;
      if (activitiesByDate[date]) return;

      setLoadingDates((prev) => ({ ...prev, [date]: true }));
      try {
        const list = await getTripActivitiesByDate(tripId, date);
        setActivitiesByDate((prev) => ({ ...prev, [date]: list }));
        setIndexByDate((prev) => ({ ...prev, [date]: list.length }));
      } catch {
        toast.error('Erro ao carregar atividades do dia');
      } finally {
        setLoadingDates((prev) => ({ ...prev, [date]: false }));
      }
    },
    [activitiesByDate, tripId]
  );

  const reloadDate = useCallback(
    async (date: string) => {
      setLoadingDates((prev) => ({ ...prev, [date]: true }));
      try {
        const list = await getTripActivitiesByDate(tripId, date);
        setActivitiesByDate((prev) => ({ ...prev, [date]: list }));
        setIndexByDate((prev) => ({ ...prev, [date]: list.length }));
      } catch {
        toast.error('Erro ao atualizar atividades do dia');
      } finally {
        setLoadingDates((prev) => ({ ...prev, [date]: false }));
      }
    },
    [tripId]
  );

  // Initial index load
  useEffect(() => {
    if (!initialIndex) {
      loadIndex();
    }
  }, [initialIndex, loadIndex]);

  // Ensure active day is loaded
  useEffect(() => {
    if (!activeDate) return;
    loadDate(activeDate);
  }, [activeDate, loadDate]);

  // Prefetch neighbors for smoother swiping
  useEffect(() => {
    if (!activeDate) return;
    const prev = tripDays[activeIndex - 1];
    const next = tripDays[activeIndex + 1];
    if (prev) loadDate(prev);
    if (next) loadDate(next);
  }, [activeDate, activeIndex, tripDays, loadDate]);

  const dayCountsForCarousel = useMemo(() => {
    const out: Record<string, { length: number }> = {};
    for (const d of tripDays) {
      out[d] = { length: indexByDate[d] ?? 0 };
    }
    return out;
  }, [tripDays, indexByDate]);

  const openAddForDate = useCallback((date: string) => {
    setSelectedDate(date);
    setIsAddOpen(true);
  }, []);

  const openAdd = useCallback(
    (date?: string) => {
      openAddForDate(date || activeDate);
    },
    [activeDate, openAddForDate]
  );

  useEffect(() => {
    onRegisterAdd?.(openAdd);
  }, [onRegisterAdd, openAdd]);

  const handleAddSuccess = async () => {
    setIsAddOpen(false);
    const date = selectedDate || activeDate;
    setSelectedDate(null);
    await loadIndex();
    if (date) await reloadDate(date);
    router.refresh();
  };

  const handleEditSuccess = async () => {
    setIsEditOpen(false);
    const date = editingActivity?.date || activeDate;
    setEditingActivity(null);
    await loadIndex();
    if (date) await reloadDate(date);
    router.refresh();
  };

  const handleDeleteSuccess = async () => {
    setIsDeleteOpen(false);
    const date = deletingActivity?.date || activeDate;
    setDeletingActivity(null);
    await loadIndex();
    if (date) await reloadDate(date);
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
        description: `${payload?.created || 0} criadas, ${payload?.updated || 0} atualizadas${
          payload?.failed ? `, ${payload.failed} falhas` : ''
        }.`,
      });
    },
    [tripId, router]
  );

  const handleSyncActivity = useCallback(
    async (activity: ActivityWithCreator) => {
      if (googleCalendarConnected === false) {
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

  const renderDay = (date: string) => {
    const isLoading = !!loadingDates[date];
    const list = activitiesByDate[date] || [];

    if (isLoading && !list.length) {
      return (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
          Carregando atividades...
        </div>
      );
    }

    if (!list.length) {
      return (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium">Nenhuma atividade neste dia</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Adicione a primeira atividade para começar a organizar o roteiro.
          </p>
          <Button size="sm" className="mt-3 h-11 sm:h-9" onClick={() => openAddForDate(date)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Adicionar atividade
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {list.map((activity, idx) => (
          <TimelineActivityItem
            key={activity.id}
            activity={activity}
            isFirst={idx === 0}
            isLast={idx === list.length - 1}
            onClick={(a) => {
              setViewingActivity(a);
              setIsDetailOpen(true);
            }}
          />
        ))}
      </div>
    );
  };

  if (tripDays.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">Roteiro</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {isIndexLoading ? 'Carregando...' : 'Planeje o dia a dia da viagem'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(routes.trip.itinerary(tripId))}
              >
                Ver roteiro
              </Button>
              <Button size="sm" onClick={() => openAddForDate(activeDate)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Atividade
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <DayCarousel
            dates={tripDays}
            tripDays={tripDays}
            activitiesByDate={dayCountsForCarousel}
            activeIndex={activeIndex}
            onDayChange={setActiveIndex}
          >
            {tripDays.map((date) => (
              <div key={date} className="rounded-lg border bg-background p-2 sm:p-3">
                {renderDay(date)}
              </div>
            ))}
          </DayCarousel>
        </CardContent>
      </Card>

      <ActivityDetailSheet
        activity={viewingActivity}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(activity) => {
          setIsDetailOpen(false);
          setEditingActivity(activity);
          setIsEditOpen(true);
        }}
        onDelete={(activity) => {
          setIsDetailOpen(false);
          setDeletingActivity(activity);
          setIsDeleteOpen(true);
        }}
        onSync={handleSyncActivity}
        isSyncing={syncingActivityId === viewingActivity?.id}
      />

      <AddActivityDialog
        tripId={tripId}
        defaultDate={selectedDate || activeDate}
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleAddSuccess}
      />

      <EditActivityDialog
        activity={editingActivity}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={handleEditSuccess}
      />

      <DeleteActivityDialog
        activity={deletingActivity}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
