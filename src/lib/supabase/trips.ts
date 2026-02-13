'use server';

import { createClient } from './server';
import { revalidate } from '@/lib/utils/revalidation';
import type { Trip, TripMember, User, TripStyle, TransportType } from '@/types/database';
import type { SupportedCurrency } from '@/types/currency';
import { logActivity } from '@/lib/supabase/activity-log';
import { can, isOrganizer } from '@/lib/permissions/trip-permissions';

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
  base_currency?: SupportedCurrency;
  transport_type?: TransportType;
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

  // Use RPC function to create trip and member atomically
  // This bypasses RLS issues and ensures the user profile exists
  const { data: tripId, error } = await supabase.rpc('create_trip_with_member', {
    p_name: input.name,
    p_destination: input.destination,
    p_start_date: input.start_date,
    p_end_date: input.end_date,
    p_description: input.description || null,
    p_style: input.style || null,
  });

  if (error) {
    return { error: error.message };
  }

  // Update base_currency if provided (RPC creates with default 'BRL')
  if (input.base_currency && input.base_currency !== 'BRL' && tripId) {
    const { error: updateError } = await supabase
      .from('trips')
      .update({ base_currency: input.base_currency })
      .eq('id', tripId);

    if (updateError) {
      return { error: updateError.message };
    }
  }

  // Update transport_type if provided (RPC creates with default 'plane')
  if (input.transport_type && input.transport_type !== 'plane' && tripId) {
    const { error: transportError } = await supabase
      .from('trips')
      .update({ transport_type: input.transport_type })
      .eq('id', tripId);

    if (transportError) {
      return { error: transportError.message };
    }
  }

  revalidate.trips();

  if (tripId) {
    logActivity({
      tripId,
      action: 'created',
      entityType: 'trip',
      entityId: tripId,
      metadata: { name: input.name, destination: input.destination },
    });
  }

  return { success: true, tripId };
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

  if (!member || !can('EDIT_TRIP', member.role)) {
    return { error: 'Apenas organizadores podem editar a viagem' };
  }

  // Block base_currency change if trip has expenses
  if (input.base_currency !== undefined) {
    const { count } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId);

    if (count && count > 0) {
      return { error: 'Não é possível alterar a moeda base após registrar despesas.' };
    }
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
      ...(input.base_currency !== undefined && { base_currency: input.base_currency }),
      ...(input.transport_type !== undefined && { transport_type: input.transport_type }),
    })
    .eq('id', tripId);

  if (error) {
    return { error: error.message };
  }

  revalidate.trip(tripId);

  logActivity({
    tripId,
    action: 'updated',
    entityType: 'trip',
    entityId: tripId,
    metadata: { updatedFields: Object.keys(input) },
  });

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

  if (!member || !can('ARCHIVE_TRIP', member.role)) {
    return { error: 'Apenas organizadores podem arquivar a viagem' };
  }

  const { error } = await supabase
    .from('trips')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', tripId);

  if (error) {
    return { error: error.message };
  }

  revalidate.trip(tripId);

  logActivity({
    tripId,
    action: 'archived',
    entityType: 'trip',
    entityId: tripId,
  });

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

  if (!member || !can('ARCHIVE_TRIP', member.role)) {
    return { error: 'Apenas organizadores podem desarquivar a viagem' };
  }

  const { error } = await supabase.from('trips').update({ archived_at: null }).eq('id', tripId);

  if (error) {
    return { error: error.message };
  }

  revalidate.trip(tripId);

  logActivity({
    tripId,
    action: 'unarchived',
    entityType: 'trip',
    entityId: tripId,
  });

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

  if (!member || !can('DELETE_TRIP', member.role)) {
    return { error: 'Apenas organizadores podem excluir a viagem' };
  }

  // Log before delete since trip and activity log will be gone after deletion
  logActivity({
    tripId,
    action: 'deleted',
    entityType: 'trip',
    entityId: tripId,
  });

  // Delete the trip (cascades to members, activities, expenses, etc.)
  const { error } = await supabase.from('trips').delete().eq('id', tripId);

  if (error) {
    return { error: error.message };
  }

  revalidate.trips();

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

export type TripMemberWithUser = TripMember & {
  users: User;
  invited_by_user?: Pick<User, 'id' | 'name'> | null;
};

/**
 * Gets all members of a trip with their user details
 */
export async function getTripMembers(tripId: string): Promise<TripMemberWithUser[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!membership) {
    return [];
  }

  const { data: members } = await supabase
    .from('trip_members')
    .select(
      `
      *,
      users!trip_members_user_id_fkey (*),
      invited_by_user:users!trip_members_invited_by_fkey (id, name)
    `
    )
    .eq('trip_id', tripId)
    .order('joined_at', { ascending: true });

  return (members as TripMemberWithUser[]) || [];
}

/**
 * Removes a participant from a trip (organizers only)
 */
export async function removeParticipant(tripId: string, userId: string): Promise<TripResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if current user is an organizer
  const { data: currentMember } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!currentMember || !can('MANAGE_MEMBERS', currentMember.role)) {
    return { error: 'Apenas organizadores podem remover participantes' };
  }

  // Check if target user is a member
  const { data: targetMember } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();

  if (!targetMember) {
    return { error: 'Usuário não é membro desta viagem' };
  }

  // Cannot remove self if organizer (must transfer ownership or delete trip)
  if (userId === authUser.id) {
    return {
      error: 'Você não pode remover a si mesmo. Use "Sair da viagem" ou transfira a organização.',
    };
  }

  // Cannot remove other organizers (would need to implement demotion first)
  if (isOrganizer(targetMember.role)) {
    return { error: 'Não é possível remover outro organizador' };
  }

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripParticipants(tripId);

  logActivity({
    tripId,
    action: 'removed',
    entityType: 'trip_member',
    metadata: { removedUserId: userId },
  });

  return { success: true };
}

/**
 * Leave a trip (any member except sole organizer)
 */
export async function leaveTrip(tripId: string): Promise<TripResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Get current user's membership
  const { data: membership } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!membership) {
    return { error: 'Você não é membro desta viagem' };
  }

  // If organizer, check if there are other organizers
  if (isOrganizer(membership.role)) {
    const { data: organizers } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('role', 'organizer');

    if (!organizers || organizers.length <= 1) {
      return {
        error:
          'Você é o único organizador. Transfira a organização para outro participante antes de sair, ou exclua a viagem.',
      };
    }
  }

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripParticipants(tripId);

  return { success: true };
}

/**
 * Promote a participant to organizer
 */
export async function promoteToOrganizer(tripId: string, userId: string): Promise<TripResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if current user is an organizer
  const { data: currentMember } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!currentMember || !can('MANAGE_MEMBERS', currentMember.role)) {
    return { error: 'Apenas organizadores podem promover participantes' };
  }

  // Check if target user is a member
  const { data: targetMember } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();

  if (!targetMember) {
    return { error: 'Usuário não é membro desta viagem' };
  }

  if (isOrganizer(targetMember.role)) {
    return { error: 'Usuário já é organizador' };
  }

  const { error } = await supabase
    .from('trip_members')
    .update({ role: 'organizer' })
    .eq('trip_id', tripId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidate.tripParticipants(tripId);

  logActivity({
    tripId,
    action: 'promoted',
    entityType: 'trip_member',
    metadata: { promotedUserId: userId },
  });

  return { success: true };
}
