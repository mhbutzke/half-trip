import { useEffect, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type TableName =
  | 'trips'
  | 'activities'
  | 'expenses'
  | 'trip_members'
  | 'trip_notes'
  | 'settlements';

type RealtimePayload<T extends Record<string, unknown> = Record<string, unknown>> =
  RealtimePostgresChangesPayload<T>;

interface RealtimeSubscriptionOptions {
  table: TableName;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: RealtimePayload) => void;
  onUpdate?: (payload: RealtimePayload) => void;
  onDelete?: (payload: RealtimePayload) => void;
  onChange?: (payload: RealtimePayload) => void;
}

/**
 * Hook for subscribing to Supabase Realtime updates
 * Automatically cleans up subscription on unmount
 */
export function useRealtimeSubscription({
  table,
  filter,
  event = '*',
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: RealtimeSubscriptionOptions) {
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
    onChangeRef.current = onChange;
  }, [onInsert, onUpdate, onDelete, onChange]);

  useEffect(() => {
    const supabase = createClient();
    // Create channel with unique name
    const channelName = `${table}-${filter || 'all'}-${event}-${Date.now()}`;
    const channel: RealtimeChannel = supabase.channel(channelName);

    // Build the postgres_changes configuration
    const config: {
      event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema: string;
      table: TableName;
      filter?: string;
    } = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      config.filter = filter;
    }

    // Subscribe to postgres_changes events
    // Type assertion needed for postgres_changes event type
    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      config,
      (payload: RealtimePayload) => {
        // Call the appropriate callback based on event type
        if (payload.eventType === 'INSERT' && onInsertRef.current) {
          onInsertRef.current(payload);
        } else if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
          onUpdateRef.current(payload);
        } else if (payload.eventType === 'DELETE' && onDeleteRef.current) {
          onDeleteRef.current(payload);
        }

        // Always call the generic onChange if provided
        if (onChangeRef.current) {
          onChangeRef.current(payload);
        }
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${table} realtime updates`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to ${table} realtime updates`);
      }
    });

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        console.log(`🔌 Unsubscribed from ${table} realtime updates`);
      }
    };
  }, [table, filter, event]);
}
