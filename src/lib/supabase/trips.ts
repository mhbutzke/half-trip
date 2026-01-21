'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';
import type { Trip, TripMember, User, TripStyle } from '@/types/database';

export type TripResult = {
  error?: string;
  success?: boolean;
  tripId?: string;
};

export type TripWithMembers = Trip & {
  trip_members: (TripMember & {
    users: User;
  })[];
  memberCount: number;
};

export type CreateTripInput = {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string | null;
  style?: TripStyle | null;
};

export type UpdateTripInput = Partial<CreateTripInput>;

export async function createTrip(input: CreateTripInput): Promise<TripResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Create the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      name: input.name,
      destination: input.destination,
      start_date: input.start_date,
      end_date: input.end_date,
      description: input.description || null,
      style: input.style || null,
      created_by: authUser.id,
    })
    .select('id')
    .single();

  if (tripError) {
    return { error: tripError.message };
  }

  // Add the creator as an organizer
  const { error: memberError } = await supabase.from('trip_members').insert({
    trip_id: trip.id,
    user_id: authUser.id,
    role: 'organizer',
  });

  if (memberError) {
    // Rollback: delete the trip if member creation fails
    await supabase.from('trips').delete().eq('id', trip.id);
    return { error: memberError.message };
  }

  revalidatePath('/trips');

  return { success: true, tripId: trip.id };
}

export async function updateTrip(tripId: string, input: UpdateTripInput): Promise<TripResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is an organizer
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member || member.role !== 'organizer') {
    return { error: 'Apenas organizadores podem editar a viagem' };
  }

  const { error } = await supabase
    .from('trips')
    .update({
      ...(input.name && { name: input.name }),
      ...(input.destination && { destination: input.destination }),
      ...(input.start_date && { start_date: input.start_date }),
      ...(input.end_date && { end_date: input.end_date }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.style !== undefined && { style: input.style }),
    })
    .eq('id', tripId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/trips');
  revalidatePath(`/trip/${tripId}`);

  return { success: true, tripId };
}

export async function archiveTrip(tripId: string): Promise<TripResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is an organizer
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member || member.role !== 'organizer') {
    return { error: 'Apenas organizadores podem arquivar a viagem' };
  }

  const { error } = await supabase
    .from('trips')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', tripId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/trips');
  revalidatePath(`/trip/${tripId}`);

  return { success: true };
}

export async function unarchiveTrip(tripId: string): Promise<TripResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is an organizer
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member || member.role !== 'organizer') {
    return { error: 'Apenas organizadores podem desarquivar a viagem' };
  }

  const { error } = await supabase.from('trips').update({ archived_at: null }).eq('id', tripId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/trips');
  revalidatePath(`/trip/${tripId}`);

  return { success: true };
}

export async function deleteTrip(tripId: string): Promise<TripResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is an organizer
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member || member.role !== 'organizer') {
    return { error: 'Apenas organizadores podem excluir a viagem' };
  }

  // Delete the trip (cascades to members, activities, expenses, etc.)
  const { error } = await supabase.from('trips').delete().eq('id', tripId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/trips');

  return { success: true };
}

export async function getUserTrips(): Promise<TripWithMembers[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Get all trips where the user is a member
  const { data: memberTrips } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', authUser.id);

  if (!memberTrips || memberTrips.length === 0) {
    return [];
  }

  const tripIds = memberTrips.map((m) => m.trip_id);

  // Get trips with their members
  // Note: We use users!trip_members_user_id_fkey to hint which FK to use (there's also invited_by)
  const { data: trips } = await supabase
    .from('trips')
    .select(
      `
      *,
      trip_members (
        *,
        users!trip_members_user_id_fkey (*)
      )
    `
    )
    .in('id', tripIds)
    .is('archived_at', null)
    .order('start_date', { ascending: true });

  if (!trips) {
    return [];
  }

  return trips.map((trip) => ({
    ...trip,
    memberCount: trip.trip_members?.length || 0,
  })) as unknown as TripWithMembers[];
}

export async function getArchivedTrips(): Promise<TripWithMembers[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Get all trips where the user is a member
  const { data: memberTrips } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', authUser.id);

  if (!memberTrips || memberTrips.length === 0) {
    return [];
  }

  const tripIds = memberTrips.map((m) => m.trip_id);

  // Get archived trips with their members
  const { data: trips } = await supabase
    .from('trips')
    .select(
      `
      *,
      trip_members (
        *,
        users!trip_members_user_id_fkey (*)
      )
    `
    )
    .in('id', tripIds)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  if (!trips) {
    return [];
  }

  return trips.map((trip) => ({
    ...trip,
    memberCount: trip.trip_members?.length || 0,
  })) as unknown as TripWithMembers[];
}

export async function getTripById(tripId: string): Promise<TripWithMembers | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Check if user is a member
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return null;
  }

  // Get trip with members
  const { data: trip } = await supabase
    .from('trips')
    .select(
      `
      *,
      trip_members (
        *,
        users!trip_members_user_id_fkey (*)
      )
    `
    )
    .eq('id', tripId)
    .single();

  if (!trip) {
    return null;
  }

  return {
    ...trip,
    memberCount: trip.trip_members?.length || 0,
  } as unknown as TripWithMembers;
}

export async function getUserRoleInTrip(
  tripId: string
): Promise<'organizer' | 'participant' | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  return member?.role || null;
}
