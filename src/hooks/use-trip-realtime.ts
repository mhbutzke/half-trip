import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from './use-realtime-subscription';

interface UseTripRealtimeOptions {
  tripId: string;
  onPollChange?: () => void;
}

/**
 * Hook for subscribing to all trip-related realtime updates
 * Automatically invalidates React Query caches when data changes
 */
export function useTripRealtime({ tripId, onPollChange }: UseTripRealtimeOptions) {
  const queryClient = useQueryClient();

  // Subscribe to trip changes
  useRealtimeSubscription({
    table: 'trips',
    filter: `id=eq.${tripId}`,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });

  // Subscribe to activity changes
  useRealtimeSubscription({
    table: 'activities',
    filter: `trip_id=eq.${tripId}`,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activity-count', tripId] });
    },
  });

  // Subscribe to expense changes
  useRealtimeSubscription({
    table: 'expenses',
    filter: `trip_id=eq.${tripId}`,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-count', tripId] });
      queryClient.invalidateQueries({ queryKey: ['balance', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });
    },
  });

  // Subscribe to trip member changes
  useRealtimeSubscription({
    table: 'trip_members',
    filter: `trip_id=eq.${tripId}`,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['balance', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });
    },
  });

  // Subscribe to notes changes
  useRealtimeSubscription({
    table: 'trip_notes',
    filter: `trip_id=eq.${tripId}`,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', tripId] });
      queryClient.invalidateQueries({ queryKey: ['notes-count', tripId] });
    },
  });

  // Subscribe to activity log changes
  useRealtimeSubscription({
    table: 'trip_activity_log',
    filter: `trip_id=eq.${tripId}`,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log', tripId] });
    },
  });

  // Subscribe to settlement changes
  useRealtimeSubscription({
    table: 'settlements',
    filter: `trip_id=eq.${tripId}`,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements', tripId] });
      queryClient.invalidateQueries({ queryKey: ['balance', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });
    },
  });

  // Subscribe to poll changes
  useRealtimeSubscription({
    table: 'trip_polls',
    filter: `trip_id=eq.${tripId}`,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', tripId] });
      onPollChange?.();
    },
  });

  // Subscribe to poll vote changes
  useRealtimeSubscription({
    table: 'poll_votes',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', tripId] });
      onPollChange?.();
    },
  });
}
