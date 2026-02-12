'use server';

import { createClient } from './server';
import type { ActivityLogEntry, LogActivityInput } from '@/types/activity-log';
import type { Json } from '@/types/database';

/**
 * Log an activity to the trip timeline.
 * Fire-and-forget: errors are silently swallowed to avoid
 * disrupting the parent operation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('trip_activity_log').insert({
      trip_id: input.tripId,
      user_id: user.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: (input.metadata ?? {}) as Json,
    });
  } catch {
    // Silently fail - logging should never break the main flow
  }
}

/**
 * Fetch paginated activity log for a trip.
 */
export async function getTripActivityLog(
  tripId: string,
  limit = 30,
  offset = 0
): Promise<{ entries: ActivityLogEntry[]; hasMore: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { entries: [], hasMore: false };

  // Check membership
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single();
  if (!member) return { entries: [], hasMore: false };

  // Fetch one extra to know if there's more
  const { data } = await supabase
    .from('trip_activity_log')
    .select(
      `
      *,
      users!trip_activity_log_user_id_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit);

  const entries = (data as ActivityLogEntry[]) || [];
  const hasMore = entries.length > limit;

  return {
    entries: hasMore ? entries.slice(0, limit) : entries,
    hasMore,
  };
}
