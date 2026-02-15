'use client';

import { useEffect, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { logDebug, logError, logWarning } from '@/lib/errors/logger';

type TableName =
  | 'trips'
  | 'activities'
  | 'expenses'
  | 'trip_members'
  | 'trip_notes'
  | 'settlements'
  | 'trip_activity_log'
  | 'trip_polls'
  | 'poll_votes';

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

function hashStringToHex(input: string): string {
  // Small, deterministic hash for channel naming (avoid invalid topic characters).
  // Not cryptographic; just to keep names short + stable.
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
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
    // Create channel with a safe topic name (avoid '*', '=', '.', spaces, etc.).
    const nonce =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const eventKey = event === '*' ? 'all' : event.toLowerCase();
    const filterKey = filter ? `f_${hashStringToHex(filter)}` : 'all';
    const channelName = `rt:pg:${table}:${eventKey}:${filterKey}:${nonce}`;
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

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logDebug(`Subscribed to ${table} realtime updates`);
      } else if (status === 'CHANNEL_ERROR') {
        logError(`Error subscribing to ${table} realtime updates`, {
          action: 'realtime-subscribe',
          table,
          error: err,
        });
      } else if (status === 'TIMED_OUT') {
        logWarning(`Timed out subscribing to ${table} realtime updates`, { table });
      } else if (status === 'CLOSED') {
        logDebug(`Realtime channel closed for ${table}`);
      }
    });

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, filter, event]);
}
