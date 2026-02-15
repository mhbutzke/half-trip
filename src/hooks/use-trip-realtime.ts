'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { logDebug, logError, logWarning } from '@/lib/errors/logger';

interface UseTripRealtimeOptions {
  tripId: string;
  onPollChange?: () => void;
}

/**
 * Consolidated realtime subscription for all trip-related tables.
 *
 * Instead of creating 9 separate Supabase channels (one per table), this hook
 * creates a **single channel** with multiple `postgres_changes` listeners.
 * This drastically reduces WebSocket overhead and avoids the
 * "Max payload size exceeded" error that occurred with many parallel channels.
 *
 * Automatically invalidates React Query caches when data changes.
 */
export function useTripRealtime({ tripId, onPollChange }: UseTripRealtimeOptions) {
  const queryClient = useQueryClient();
  const onPollChangeRef = useRef(onPollChange);

  useEffect(() => {
    onPollChangeRef.current = onPollChange;
  }, [onPollChange]);

  const invalidate = useCallback(
    (keys: string[][]) => {
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    const supabase = createClient();
    const channelName = `trip-realtime:${tripId}`;

    const channel = supabase
      .channel(channelName)
      // trips
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        () => invalidate([['trip', tripId]])
      )
      // activities
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'activities', filter: `trip_id=eq.${tripId}` },
        () =>
          invalidate([
            ['activities', tripId],
            ['activity-count', tripId],
          ])
      )
      // expenses
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` },
        () =>
          invalidate([
            ['expenses', tripId],
            ['expense-count', tripId],
            ['balance', tripId],
            ['expense-summary', tripId],
          ])
      )
      // trip_members
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` },
        () =>
          invalidate([
            ['trip-members', tripId],
            ['trip', tripId],
            ['balance', tripId],
            ['expense-summary', tripId],
          ])
      )
      // trip_notes
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'trip_notes', filter: `trip_id=eq.${tripId}` },
        () =>
          invalidate([
            ['notes', tripId],
            ['notes-count', tripId],
          ])
      )
      // trip_activity_log
      .on(
        'postgres_changes' as 'system',
        {
          event: '*',
          schema: 'public',
          table: 'trip_activity_log',
          filter: `trip_id=eq.${tripId}`,
        },
        () => invalidate([['activity-log', tripId]])
      )
      // settlements
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'settlements', filter: `trip_id=eq.${tripId}` },
        () =>
          invalidate([
            ['settlements', tripId],
            ['balance', tripId],
            ['expense-summary', tripId],
          ])
      )
      // trip_polls
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'trip_polls', filter: `trip_id=eq.${tripId}` },
        () => {
          invalidate([['polls', tripId]]);
          onPollChangeRef.current?.();
        }
      )
      // poll_votes (no trip_id filter — votes reference poll_id, not trip_id)
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'poll_votes' },
        () => {
          invalidate([['polls', tripId]]);
          onPollChangeRef.current?.();
        }
      );

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logDebug(`Subscribed to trip realtime updates (single channel)`, {
          tripId,
          channel: channelName,
        });
      } else if (status === 'CHANNEL_ERROR') {
        logError(`Error subscribing to trip realtime updates`, {
          action: 'trip-realtime-subscribe',
          tripId,
          error: err,
        });
      } else if (status === 'TIMED_OUT') {
        logWarning(`Timed out subscribing to trip realtime updates`, { tripId });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, invalidate]);
}
