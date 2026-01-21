'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Archive } from 'lucide-react';
import { TripCard } from '@/components/trips/trip-card';
import { EditTripDialog } from '@/components/trips/edit-trip-dialog';
import { DeleteTripDialog } from '@/components/trips/delete-trip-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import {
  getUserTrips,
  getArchivedTrips,
  archiveTrip,
  unarchiveTrip,
  type TripWithMembers,
} from '@/lib/supabase/trips';

interface TripsListProps {
  emptyState: ReactNode;
}

export function TripsList({ emptyState }: TripsListProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithMembers[]>([]);
  const [archivedTrips, setArchivedTrips] = useState<TripWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTrip, setEditingTrip] = useState<TripWithMembers | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const [activeTrips, archived] = await Promise.all([getUserTrips(), getArchivedTrips()]);
      setTrips(activeTrips);
      setArchivedTrips(archived);
    } catch {
      toast.error('Erro ao carregar viagens');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Subscribe to trip changes
  useRealtimeSubscription({
    table: 'trips',
    onChange: () => {
      console.log('🔄 Trips changed, reloading list');
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
    // Find the current user in trip members by checking if they're the creator
    const organizer = trip.trip_members?.find((m) => m.role === 'organizer');
    if (organizer && trip.created_by === organizer.user_id) {
      return 'organizer';
    }
    // Fallback: check if any member is organizer
    const member = trip.trip_members?.find(
      (m) => m.role === 'organizer' || m.role === 'participant'
    );
    return member?.role || null;
  };

  if (isLoading) {
    return null; // Suspense will show loading state
  }

  const hasTrips = trips.length > 0;
  const hasArchivedTrips = archivedTrips.length > 0;

  if (!hasTrips && !hasArchivedTrips) {
    return emptyState;
  }

  return (
    <>
      {hasArchivedTrips ? (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="active" className="flex items-center gap-2">
              Ativas
              {hasTrips && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                  {trips.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Arquivadas
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {archivedTrips.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {hasTrips ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trips.map((trip) => (
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
              emptyState
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archivedTrips.map((trip) => (
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
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
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
    </>
  );
}
