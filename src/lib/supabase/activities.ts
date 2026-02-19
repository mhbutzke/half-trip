'use server';

import { requireAuth, requireTripMember } from './auth-helpers';
import { revalidate } from '@/lib/utils/revalidation';
import { logActivity } from './activity-log';
import type { Activity, ActivityCategory, ActivityLink, Json } from '@/types/database';

export type ActivityResult = {
  error?: string;
  success?: boolean;
  activityId?: string;
};

export type ActivityWithCreator = Activity & {
  users: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  attachments_count?: number;
  expense_count?: number;
};

export type CreateActivityInput = {
  trip_id: string;
  title: string;
  date: string;
  start_time?: string | null;
  duration_minutes?: number | null;
  location?: string | null;
  description?: string | null;
  category: ActivityCategory;
  links?: ActivityLink[];
  metadata?: Json;
};

export type UpdateActivityInput = Partial<Omit<CreateActivityInput, 'trip_id'>>;

/**
 * Creates a new activity for a trip
 */
export async function createActivity(input: CreateActivityInput): Promise<ActivityResult> {
  const member = await requireTripMember(input.trip_id);

  if (!member.ok) {
    return { error: member.error };
  }

  const { supabase, user } = member;

  // Get the max sort_order for activities on this date
  const { data: maxOrderResult } = await supabase
    .from('activities')
    .select('sort_order')
    .eq('trip_id', input.trip_id)
    .eq('date', input.date)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (maxOrderResult?.sort_order ?? -1) + 1;

  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      trip_id: input.trip_id,
      title: input.title,
      date: input.date,
      start_time: input.start_time || null,
      duration_minutes: input.duration_minutes || null,
      location: input.location || null,
      description: input.description || null,
      category: input.category,
      links: input.links || [],
      metadata: input.metadata || {},
      sort_order: nextSortOrder,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidate.tripItinerary(input.trip_id);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'activity',
    entityId: activity.id,
    metadata: { title: input.title },
  });

  return { success: true, activityId: activity.id };
}

/**
 * Updates an existing activity
 */
export async function updateActivity(
  activityId: string,
  input: UpdateActivityInput
): Promise<ActivityResult> {
  const auth = await requireAuth();

  if (!auth.ok) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  // Get the activity to check trip membership
  const { data: activity } = await supabase
    .from('activities')
    .select('trip_id')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return { error: 'Atividade não encontrada' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', activity.trip_id)
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  const { error } = await supabase
    .from('activities')
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.start_time !== undefined && { start_time: input.start_time }),
      ...(input.duration_minutes !== undefined && { duration_minutes: input.duration_minutes }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.links !== undefined && { links: input.links }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    })
    .eq('id', activityId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripItinerary(activity.trip_id);

  logActivity({
    tripId: activity.trip_id,
    action: 'updated',
    entityType: 'activity',
    entityId: activityId,
    metadata: { title: input.title },
  });

  return { success: true, activityId };
}

/**
 * Deletes an activity
 */
export async function deleteActivity(activityId: string): Promise<ActivityResult> {
  const auth = await requireAuth();

  if (!auth.ok) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  // Get the activity to check trip membership
  const { data: activity } = await supabase
    .from('activities')
    .select('trip_id, title')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return { error: 'Atividade não encontrada' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', activity.trip_id)
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  const { error } = await supabase.from('activities').delete().eq('id', activityId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripItinerary(activity.trip_id);

  logActivity({
    tripId: activity.trip_id,
    action: 'deleted',
    entityType: 'activity',
    entityId: activityId,
    metadata: { title: activity.title },
  });

  return { success: true };
}

/**
 * Gets all activities for a trip, ordered by date and sort_order
 */
export async function getTripActivities(tripId: string): Promise<ActivityWithCreator[]> {
  const member = await requireTripMember(tripId);

  if (!member.ok) {
    return [];
  }

  const { supabase } = member;

  // Safety limit to prevent unbounded payloads on very long trips
  const { data: activities } = await supabase
    .from('activities')
    .select(
      `
      *,
      users!activities_created_by_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .order('date', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(500);

  const parsedActivities = (activities as ActivityWithCreator[]) || [];
  if (parsedActivities.length === 0) {
    return [];
  }

  const activityIds = parsedActivities.map((activity) => activity.id);
  const { data: attachmentRows } = await supabase
    .from('activity_attachments')
    .select('activity_id')
    .in('activity_id', activityIds);

  const attachmentsByActivity = new Map<string, number>();
  for (const row of attachmentRows || []) {
    const count = attachmentsByActivity.get(row.activity_id) || 0;
    attachmentsByActivity.set(row.activity_id, count + 1);
  }

  // Count expenses linked to each activity
  const { data: expenseRows } = await supabase
    .from('expenses')
    .select('activity_id')
    .in('activity_id', activityIds)
    .not('activity_id', 'is', null);

  const expensesByActivity = new Map<string, number>();
  for (const row of expenseRows || []) {
    if (row.activity_id) {
      const count = expensesByActivity.get(row.activity_id) || 0;
      expensesByActivity.set(row.activity_id, count + 1);
    }
  }

  return parsedActivities.map((activity) => ({
    ...activity,
    attachments_count: attachmentsByActivity.get(activity.id) || 0,
    expense_count: expensesByActivity.get(activity.id) || 0,
  }));
}

type PaginatedResult<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
};

const ACTIVITIES_PAGE_SIZE = 50;

/**
 * Gets paginated activities for a trip (for list view).
 * Use getTripActivities() when you need the full set.
 */
export async function getTripActivitiesPaginated(
  tripId: string,
  page: number = 0,
  limit: number = ACTIVITIES_PAGE_SIZE
): Promise<PaginatedResult<ActivityWithCreator>> {
  const member = await requireTripMember(tripId);
  if (!member.ok) return { items: [], total: 0, hasMore: false };

  const { supabase } = member;
  const from = page * limit;
  const to = from + limit - 1;

  const [countResult, dataResult] = await Promise.all([
    supabase.from('activities').select('id', { count: 'exact', head: true }).eq('trip_id', tripId),
    supabase
      .from('activities')
      .select(
        `
        *,
        users!activities_created_by_fkey (
          id,
          name,
          avatar_url
        )
      `
      )
      .eq('trip_id', tripId)
      .order('date', { ascending: true })
      .order('sort_order', { ascending: true })
      .range(from, to),
  ]);

  const total = countResult.count ?? 0;
  const parsedActivities = (dataResult.data as ActivityWithCreator[]) || [];

  if (parsedActivities.length === 0) {
    return { items: [], total, hasMore: false };
  }

  // Enrich with attachment and expense counts
  const activityIds = parsedActivities.map((a) => a.id);
  const [attachmentRows, expenseRows] = await Promise.all([
    supabase.from('activity_attachments').select('activity_id').in('activity_id', activityIds),
    supabase
      .from('expenses')
      .select('activity_id')
      .in('activity_id', activityIds)
      .not('activity_id', 'is', null),
  ]);

  const attachmentsByActivity = new Map<string, number>();
  for (const row of attachmentRows.data || []) {
    attachmentsByActivity.set(
      row.activity_id,
      (attachmentsByActivity.get(row.activity_id) || 0) + 1
    );
  }

  const expensesByActivity = new Map<string, number>();
  for (const row of expenseRows.data || []) {
    if (row.activity_id) {
      expensesByActivity.set(row.activity_id, (expensesByActivity.get(row.activity_id) || 0) + 1);
    }
  }

  const items = parsedActivities.map((activity) => ({
    ...activity,
    attachments_count: attachmentsByActivity.get(activity.id) || 0,
    expense_count: expensesByActivity.get(activity.id) || 0,
  }));

  return { items, total, hasMore: from + items.length < total };
}

/**
 * Gets a single activity by ID
 */
export async function getActivityById(activityId: string): Promise<ActivityWithCreator | null> {
  const auth = await requireAuth();

  if (!auth.ok) {
    return null;
  }

  const { supabase, user } = auth;

  // Get activity with trip check
  const { data: activity } = await supabase
    .from('activities')
    .select(
      `
      *,
      users!activities_created_by_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('id', activityId)
    .single();

  if (!activity) {
    return null;
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', activity.trip_id)
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return null;
  }

  return activity as ActivityWithCreator;
}

/**
 * Reorders activities within the same day or moves to a different day
 */
export async function reorderActivities(
  tripId: string,
  updates: { activityId: string; date: string; sort_order: number }[]
): Promise<ActivityResult> {
  const member = await requireTripMember(tripId);

  if (!member.ok) {
    return { error: member.error };
  }

  const { supabase } = member;

  // Update all activities in a single transaction-like manner
  for (const update of updates) {
    const { error } = await supabase
      .from('activities')
      .update({
        date: update.date,
        sort_order: update.sort_order,
      })
      .eq('id', update.activityId)
      .eq('trip_id', tripId);

    if (error) {
      return { error: error.message };
    }
  }

  revalidate.tripItinerary(tripId);

  return { success: true };
}

/**
 * Gets activities count for a trip
 */
export async function getActivitiesCount(tripId: string): Promise<number> {
  const member = await requireTripMember(tripId);

  if (!member.ok) {
    return 0;
  }

  const { supabase } = member;

  const { count } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  return count || 0;
}

/**
 * Gets an index of activity counts per date for a trip.
 * Used by itinerary preview components to render day pills efficiently.
 */
export async function getTripActivitiesIndex(tripId: string): Promise<Record<string, number>> {
  const member = await requireTripMember(tripId);

  if (!member.ok) {
    return {};
  }

  const { supabase } = member;

  const { data } = await supabase.from('activities').select('date').eq('trip_id', tripId);

  const index: Record<string, number> = {};
  for (const row of (data as { date: string }[]) || []) {
    if (!row?.date) continue;
    index[row.date] = (index[row.date] || 0) + 1;
  }

  return index;
}

/**
 * Gets all activities for a specific trip day.
 * Used by itinerary preview components to lazy-load one day at a time.
 */
export async function getTripActivitiesByDate(
  tripId: string,
  date: string
): Promise<ActivityWithCreator[]> {
  const member = await requireTripMember(tripId);

  if (!member.ok) {
    return [];
  }

  const { supabase } = member;

  const { data: activities } = await supabase
    .from('activities')
    .select(
      `
      *,
      users!activities_created_by_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .eq('date', date)
    .order('sort_order', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false });

  return (activities as ActivityWithCreator[]) || [];
}
