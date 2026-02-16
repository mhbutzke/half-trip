'use client';

import { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { isFuture, isPast } from 'date-fns';
import { Archive, Search, X } from 'lucide-react';
import { TripCard } from '@/components/trips/trip-card';
import { TripsStats } from '@/components/trips/trips-stats';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
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
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cacheTrips, getCachedUserTrips, getCachedTripMembers, getCachedUser } from '@/lib/sync';
import { getCurrentAuthUserId, getTripsForCurrentUser } from '@/lib/supabase/trips-client';
import { archiveTrip, unarchiveTrip, type TripWithMembers } from '@/lib/supabase/trips';

interface TripsListProps {
  emptyState: ReactNode;
}

export function TripsList({ emptyState }: TripsListProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [trips, setTrips] = useState<TripWithMembers[]>([]);
  const [archivedTrips, setArchivedTrips] = useState<TripWithMembers[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTrip, setEditingTrip] = useState<TripWithMembers | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOnline) {
        // Fetch from client-safe readers when online
        const { userId, activeTrips, archivedTrips: archived } = await getTripsForCurrentUser();
        setCurrentUserId(userId);
        setTrips(activeTrips);
        setArchivedTrips(archived);

        // Cache trips for offline use
        const allTrips = [...activeTrips, ...archived];
        if (userId && allTrips.length > 0) {
          await cacheTrips(allTrips);
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
        }
      }
    } catch {
      toast.error('Erro ao carregar viagens');
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadTrips();
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

  // Get user role for each trip
  const getUserRole = (trip: TripWithMembers): 'organizer' | 'participant' | null => {
    if (!currentUserId) return null;
    const member = trip.trip_members?.find((m) => m.user_id === currentUserId);
    return member?.role || null;
  };

  // Filter trips by search term
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTrips = useMemo(() => {
    if (!normalizedSearch) return trips;
    return trips.filter((trip) =>
      [trip.name, trip.destination || ''].some((field) =>
        field.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [trips, normalizedSearch]);

  const filteredArchivedTrips = useMemo(() => {
    if (!normalizedSearch) return archivedTrips;
    return archivedTrips.filter((trip) =>
      [trip.name, trip.destination || ''].some((field) =>
        field.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [archivedTrips, normalizedSearch]);

  if (isLoading) {
    return null; // Suspense will show loading state
  }

  const hasTrips = trips.length > 0;
  const hasArchivedTrips = archivedTrips.length > 0;

  if (!hasTrips && !hasArchivedTrips) {
    return emptyState;
  }

  const searchBar = (
    <div className="relative mb-4">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        placeholder="Buscar viagens..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
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
  );

  // Calculate statistics
  const allTrips = [...trips, ...archivedTrips];
  const totalTrips = allTrips.length;
  const upcomingTrips = trips.filter((trip) => isFuture(parseDateOnly(trip.start_date))).length;
  const completedTrips = allTrips.filter((trip) => isPast(parseDateOnly(trip.end_date))).length;
  const totalDestinations = new Set(
    allTrips.map((trip) => trip.destination?.trim().toLowerCase()).filter(Boolean)
  ).size;

  return (
    <PullToRefresh onRefresh={loadTrips}>
      <TripsStats
        totalTrips={totalTrips}
        upcomingTrips={upcomingTrips}
        completedTrips={completedTrips}
        totalDestinations={totalDestinations}
      />
      {searchBar}
      {hasArchivedTrips ? (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="active" className="flex items-center gap-2">
              Ativas
              {filteredTrips.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                  {filteredTrips.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Arquivadas
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {filteredArchivedTrips.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {filteredTrips.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    userRole={getUserRole(trip)}
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
              emptyState
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-6">
            {filteredArchivedTrips.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredArchivedTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    userRole={getUserRole(trip)}
                    onEdit={handleEdit}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma viagem arquivada encontrada
              </p>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {filteredTrips.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  userRole={getUserRole(trip)}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma viagem encontrada para &ldquo;{searchTerm}&rdquo;
            </p>
          )}
        </>
      )}

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
          tripName={[...trips, ...archivedTrips].find((t) => t.id === deletingTripId)?.name}
          open={!!deletingTripId}
          onOpenChange={(open) => !open && setDeletingTripId(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </PullToRefresh>
  );
}
