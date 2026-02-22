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
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch {
    return null;
  }
}

/**
 * Wait for auth session to be established (handles post-login race condition).
 * Returns the user ID once available, or null after timeout.
 */
export function waitForAuthSession(timeoutMs = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    const supabase = createClient();
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      resolve(null);
    }, timeoutMs);

    // Check immediately
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(user.id);
        }
      })
      .catch(() => {
        // Will retry via listener
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(session.user.id);
        }
      }
    });
  });
}

export async function getTripsForCurrentUser(): Promise<TripsForUser> {
  // First try to get user directly
  let userId = await getCurrentAuthUserId();

  // If no user found, wait for auth session (handles post-login race condition)
  if (!userId) {
    userId = await waitForAuthSession(3000);
  }

  if (!userId) {
    return { userId: null, activeTrips: [], archivedTrips: [] };
  }

  try {
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
  } catch {
    // If any query fails, return empty results rather than throwing
    return { userId, activeTrips: [], archivedTrips: [] };
  }
}
