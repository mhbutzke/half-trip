import { createClient } from './client';
import type { Trip, TripMember, User } from '@/types/database';

export type ClientTripWithMembers = Trip & {
  trip_members: (TripMember & {
    users: User;
  })[];
  memberCount: number;
};

type TripsForUser = {
  userId: string | null;
  activeTrips: ClientTripWithMembers[];
  archivedTrips: ClientTripWithMembers[];
};

const tripsWithMembersSelect = `
  *,
  trip_members (
    *,
    users!trip_members_user_id_fkey (*)
  )
`;

async function getMemberTripIds(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data: memberTrips } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', userId);

  return memberTrips?.map((trip) => trip.trip_id) ?? [];
}

async function getTripsByArchiveState(
  tripIds: string[],
  archived: boolean
): Promise<ClientTripWithMembers[]> {
  if (tripIds.length === 0) {
    return [];
  }

  const supabase = createClient();
  const query = supabase.from('trips').select(tripsWithMembersSelect).in('id', tripIds);

  const { data: trips } = archived
    ? await query.not('archived_at', 'is', null).order('archived_at', { ascending: false })
    : await query.is('archived_at', null).order('start_date', { ascending: true });

  if (!trips) {
    return [];
  }

  return trips.map((trip) => ({
    ...trip,
    memberCount: trip.trip_members?.length || 0,
  })) as unknown as ClientTripWithMembers[];
}

export async function getCurrentAuthUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function getTripsForCurrentUser(): Promise<TripsForUser> {
  const userId = await getCurrentAuthUserId();

  if (!userId) {
    return { userId: null, activeTrips: [], archivedTrips: [] };
  }

  const tripIds = await getMemberTripIds(userId);
  if (tripIds.length === 0) {
    return { userId, activeTrips: [], archivedTrips: [] };
  }

  const [activeTrips, archivedTrips] = await Promise.all([
    getTripsByArchiveState(tripIds, false),
    getTripsByArchiveState(tripIds, true),
  ]);

  return {
    userId,
    activeTrips,
    archivedTrips,
  };
}
