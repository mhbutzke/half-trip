'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';
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
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', input.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

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
      created_by: authUser.id,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/trip/${input.trip_id}`);
  revalidatePath(`/trip/${input.trip_id}/itinerary`);

  return { success: true, activityId: activity.id };
}

/**
 * Updates an existing activity
 */
export async function updateActivity(
  activityId: string,
  input: UpdateActivityInput
): Promise<ActivityResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

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
    .eq('user_id', authUser.id)
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

  revalidatePath(`/trip/${activity.trip_id}`);
  revalidatePath(`/trip/${activity.trip_id}/itinerary`);

  return { success: true, activityId };
}

/**
 * Deletes an activity
 */
export async function deleteActivity(activityId: string): Promise<ActivityResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

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
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  const { error } = await supabase.from('activities').delete().eq('id', activityId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/trip/${activity.trip_id}`);
  revalidatePath(`/trip/${activity.trip_id}/itinerary`);

  return { success: true };
}

/**
 * Gets all activities for a trip, ordered by date and sort_order
 */
export async function getTripActivities(tripId: string): Promise<ActivityWithCreator[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return [];
  }

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
    .order('sort_order', { ascending: true });

  return (activities as ActivityWithCreator[]) || [];
}

/**
 * Gets a single activity by ID
 */
export async function getActivityById(activityId: string): Promise<ActivityWithCreator | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

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
    .eq('user_id', authUser.id)
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
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

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

  revalidatePath(`/trip/${tripId}`);
  revalidatePath(`/trip/${tripId}/itinerary`);

  return { success: true };
}

/**
 * Gets activities count for a trip
 */
export async function getActivitiesCount(tripId: string): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return 0;
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return 0;
  }

  const { count } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  return count || 0;
}
