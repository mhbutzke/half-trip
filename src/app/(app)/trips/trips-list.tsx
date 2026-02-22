'use client';

import { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { isPast } from 'date-fns';
import { Search, X } from 'lucide-react';
import { TripCard } from '@/components/trips/trip-card';
import { TripsStats } from '@/components/trips/trips-stats';
import { WelcomeSection } from '@/components/trips/welcome-section';
import { NextTripSpotlight } from '@/components/trips/next-trip-spotlight';
import { ActionCardsRow } from '@/components/trips/action-cards-row';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseDateOnly } from '@/lib/utils/date-only';

// Lazy load dialogs - only needed when user clicks actions
const EditTripDialog = dynamic(() =>
  import('@/components/trips/edit-trip-dialog').then((mod) => ({ default: mod.EditTripDialog }))
);
const DeleteTripDialog = dynamic(() =>
  import('@/components/trips/delete-trip-dialog').then((mod) => ({ default: mod.DeleteTripDialog }))
);
import { createClient } from '@/lib/supabase/client';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cacheTrips, getCachedUserTrips, getCachedTripMembers, getCachedUser } from '@/lib/sync';
import { getCurrentAuthUserId, getTripsForCurrentUser } from '@/lib/supabase/trips-client';
import { archiveTrip, unarchiveTrip, type TripWithMembers } from '@/lib/supabase/trips';
import {
  getTripProgressBatch,
  getActionCardStats,
  type ActionCardStats,
} from '@/lib/supabase/trip-progress';
import type { TripProgressData } from '@/components/trips/trip-progress';

interface TripsListProps {
  emptyState: ReactNode;
}

export function TripsList({ emptyState }: TripsListProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [trips, setTrips] = useState<TripWithMembers[]>([]);
  const [archivedTrips, setArchivedTrips] = useState<TripWithMembers[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<TripWithMembers | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [progressData, setProgressData] = useState<Map<string, TripProgressData>>(new Map());
  const [actionStats, setActionStats] = useState<ActionCardStats>({
    pendingSettlements: 0,
    recentExpensesCount: 0,
    pendingChecklistsCount: 0,
  });
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (isOnline) {
        // Fetch from client-safe readers when online
        const { userId, activeTrips, archivedTrips: archived } = await getTripsForCurrentUser();
        setCurrentUserId(userId);
        setTrips(activeTrips);
        setArchivedTrips(archived);
        // Reset retry counter on success
        retryCountRef.current = 0;

        // Get current user info from first trip member
        if (userId && activeTrips.length > 0) {
          const currentMember = activeTrips[0].trip_members?.find((m) => m.user_id === userId);
          if (currentMember) {
            setCurrentUserName(currentMember.users?.name ?? '');
            setCurrentUserAvatar(currentMember.users?.avatar_url ?? null);
          }
        }

        // Cache trips for offline use
        const allTrips = [...activeTrips, ...archived];
        if (userId && allTrips.length > 0) {
          await cacheTrips(allTrips).catch(() => {
            // Don't fail loading if caching fails
          });
        }

        // Fetch progress data and action card stats for all trips
        if (allTrips.length > 0) {
          try {
            const tripIds = allTrips.map((t) => t.id);
            const progress = await getTripProgressBatch(tripIds);
            setProgressData(progress);
            // Find upcoming trip for pending settlements calculation
            const upcoming = [...activeTrips].sort(
              (a, b) =>
                parseDateOnly(a.start_date).getTime() - parseDateOnly(b.start_date).getTime()
            )[0];
            const stats = await getActionCardStats(tripIds, progress, upcoming?.id);
            setActionStats(stats);
          } catch {
            // Progress/stats are non-critical, don't block trip list rendering
            setProgressData(new Map());
            setActionStats({
              pendingSettlements: 0,
              recentExpensesCount: 0,
              pendingChecklistsCount: 0,
            });
          }
        }
      } else {
        // Load from cache when offline
        const userId = await getCurrentAuthUserId();
        if (userId) {
          setCurrentUserId(userId);
          const cachedTrips = await getCachedUserTrips(userId);

          // Fetch cached members for each trip to preserve role detection offline
          const tripsWithMembers: TripWithMembers[] = await Promise.all(
            cachedTrips.map(async (trip) => {
              const cachedMembers = await getCachedTripMembers(trip.id);
              const membersWithUsers = await Promise.all(
                cachedMembers.map(async (m) => {
                  const cachedUser = await getCachedUser(m.user_id);
                  return {
                    id: m.id,
                    trip_id: m.trip_id,
                    user_id: m.user_id,
                    role: m.role,
                    joined_at: m.joined_at,
                    invited_by: m.invited_by,
                    users: cachedUser ?? {
                      id: m.user_id,
                      email: '',
                      name: '',
                      avatar_url: null,
                      blocked_at: null,
                      blocked_by: null,
                      created_at: '',
                      updated_at: '',
                    },
                  };
                })
              );
              return {
                ...trip,
                trip_members: membersWithUsers,
                memberCount: cachedMembers.length,
              };
            })
          );

          const active = tripsWithMembers.filter((t) => !t.archived_at);
          const archived = tripsWithMembers.filter((t) => t.archived_at);
          setTrips(active);
          setArchivedTrips(archived);

          // Note: Progress and action card data not available offline
          setProgressData(new Map());
          setActionStats({
            pendingSettlements: 0,
            recentExpensesCount: 0,
            pendingChecklistsCount: 0,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar viagens';
      // Auto-retry up to 3 times with exponential backoff
      if (retryCountRef.current < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 4000);
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(() => {
          loadTrips();
        }, delay);
        return; // Keep loading state while retrying
      }
      setLoadError(message);
      toast.error('Erro ao carregar viagens');
    } finally {
      // Only clear loading if we're not auto-retrying
      if (retryCountRef.current === 0 || retryCountRef.current >= 3) {
        setIsLoading(false);
      }
    }
  }, [isOnline]);

  useEffect(() => {
    loadTrips();
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [loadTrips]);

  // Listen for auth state changes to reload trips (handles post-login race condition)
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Auth state changed, reload trips
        retryCountRef.current = 0;
        loadTrips();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadTrips]);

  // Subscribe to trip changes
  useRealtimeSubscription({
    table: 'trips',
    onChange: () => {
      loadTrips();
    },
  });

  const handleEdit = (trip: TripWithMembers) => {
    setEditingTrip(trip);
  };

  const handleArchive = async (tripId: string) => {
    const result = await archiveTrip(tripId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Viagem arquivada');
      loadTrips();
    }
  };

  const handleUnarchive = async (tripId: string) => {
    const result = await unarchiveTrip(tripId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Viagem desarquivada');
      loadTrips();
    }
  };

  const handleDelete = (tripId: string) => {
    setDeletingTripId(tripId);
  };

  const handleEditSuccess = () => {
    setEditingTrip(null);
    loadTrips();
    router.refresh();
  };

  const handleDeleteSuccess = () => {
    setDeletingTripId(null);
    loadTrips();
    router.refresh();
  };

  const handleManualRetry = useCallback(() => {
    retryCountRef.current = 0;
    loadTrips();
  }, [loadTrips]);

  // Get user role for each trip
  const getUserRole = (trip: TripWithMembers): 'organizer' | 'participant' | null => {
    if (!currentUserId) return null;
    const member = trip.trip_members?.find((m) => m.user_id === currentUserId);
    return member?.role || null;
  };

  // Calculate statistics and filter by date
  const allTrips = [...trips, ...archivedTrips];
  const totalTrips = allTrips.length;

  // Split trips by completion status (based on end date)
  const safeParseDateOnly = (date: string | null | undefined): Date => {
    if (!date) return new Date();
    try {
      const parsed = parseDateOnly(date);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch {
      return new Date();
    }
  };
  const upcomingTripsData = allTrips.filter((trip) => !isPast(safeParseDateOnly(trip.end_date)));
  const completedTripsData = allTrips.filter((trip) => isPast(safeParseDateOnly(trip.end_date)));

  const upcomingTrips = upcomingTripsData.length;
  const completedTrips = completedTripsData.length;

  // Filter trips by search term
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUpcomingTrips = useMemo(() => {
    if (!normalizedSearch) return upcomingTripsData;
    return upcomingTripsData.filter((trip) =>
      [trip.name ?? '', trip.destination ?? ''].some((field) =>
        field.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [upcomingTripsData, normalizedSearch]);

  const filteredCompletedTrips = useMemo(() => {
    if (!normalizedSearch) return completedTripsData;
    return completedTripsData.filter((trip) =>
      [trip.name ?? '', trip.destination ?? ''].some((field) =>
        field.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [completedTripsData, normalizedSearch]);

  if (isLoading) {
    return null; // Suspense will show loading state
  }

  if (loadError) {
    return (
      <ErrorState
        title="Erro ao carregar viagens"
        description="Não foi possível carregar suas viagens. Verifique sua conexão e tente novamente."
        error={loadError}
        onRetry={handleManualRetry}
      />
    );
  }

  const hasUpcomingTrips = upcomingTripsData.length > 0;
  const hasCompletedTrips = completedTripsData.length > 0;

  if (!hasUpcomingTrips && !hasCompletedTrips) {
    return emptyState;
  }

  const searchBar = (
    <div className="relative mb-2">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        placeholder="Buscar viagens..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-11 border-border/70 bg-background/90 pl-9 pr-9"
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
  );

  // Get next upcoming trip (closest start date)
  const nextTrip =
    upcomingTripsData.length > 0
      ? [...upcomingTripsData].sort(
          (a, b) =>
            safeParseDateOnly(a.start_date).getTime() - safeParseDateOnly(b.start_date).getTime()
        )[0]
      : null;

  return (
    <PullToRefresh onRefresh={loadTrips} className="space-y-5">
      {currentUserName && (
        <WelcomeSection userName={currentUserName} userAvatar={currentUserAvatar} />
      )}

      <TripsStats
        totalTrips={totalTrips}
        upcomingTrips={upcomingTrips}
        completedTrips={completedTrips}
      />

      {nextTrip && <NextTripSpotlight trip={nextTrip} />}

      <ActionCardsRow
        pendingSettlements={actionStats.pendingSettlements}
        recentExpensesCount={actionStats.recentExpensesCount}
        pendingChecklistsCount={actionStats.pendingChecklistsCount}
        upcomingTripId={nextTrip?.id}
      />

      {searchBar}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'upcoming' | 'completed')}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-[420px] grid-cols-2 border border-border/70 bg-muted/20 p-1">
          <TabsTrigger
            value="upcoming"
            className="flex items-center gap-2 rounded-md data-[state=active]:shadow-sm"
          >
            Próximas
            {filteredUpcomingTrips.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                {filteredUpcomingTrips.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex items-center gap-2 rounded-md data-[state=active]:shadow-sm"
          >
            Concluídas
            {filteredCompletedTrips.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {filteredCompletedTrips.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {filteredUpcomingTrips.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUpcomingTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  userRole={getUserRole(trip)}
                  progress={progressData.get(trip.id)}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : normalizedSearch ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma viagem encontrada para &ldquo;{searchTerm}&rdquo;
            </p>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma viagem próxima</p>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {filteredCompletedTrips.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCompletedTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  userRole={getUserRole(trip)}
                  progress={progressData.get(trip.id)}
                  onEdit={handleEdit}
                  onUnarchive={trip.archived_at ? handleUnarchive : undefined}
                  onArchive={!trip.archived_at ? handleArchive : undefined}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : normalizedSearch ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma viagem encontrada para &ldquo;{searchTerm}&rdquo;
            </p>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma viagem concluída
            </p>
          )}
        </TabsContent>
      </Tabs>

      {editingTrip && (
        <EditTripDialog
          trip={editingTrip}
          open={!!editingTrip}
          onOpenChange={(open) => !open && setEditingTrip(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingTripId && (
        <DeleteTripDialog
          tripId={deletingTripId}
          tripName={allTrips.find((t) => t.id === deletingTripId)?.name}
          open={!!deletingTripId}
          onOpenChange={(open) => !open && setDeletingTripId(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </PullToRefresh>
  );
}
