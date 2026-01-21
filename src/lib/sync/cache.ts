import { db } from './db';
import type {
  CachedTrip,
  CachedTripMember,
  CachedExpense,
  CachedExpenseSplit,
  CachedTripNote,
  CachedUser,
} from './db';
import type { Trip, Activity, Expense, TripMember, TripNote } from '@/types/database';

/**
 * Sync utilities for caching data to IndexedDB
 */

// ========== TRIPS ==========

export async function cacheTrip(trip: Trip): Promise<void> {
  const cached: CachedTrip = {
    ...trip,
    _syncStatus: 'synced',
    _lastSyncedAt: new Date().toISOString(),
  };
  await db.trips.put(cached);
}

export async function cacheTrips(
  trips: (Trip | (Trip & { trip_members?: unknown; memberCount?: unknown }))[]
): Promise<void> {
  const cached = trips.map((trip) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { trip_members, memberCount, ...tripData } = trip as Trip & {
      trip_members?: unknown;
      memberCount?: unknown;
    };

    return {
      ...tripData,
      _syncStatus: 'synced' as const,
      _lastSyncedAt: new Date().toISOString(),
    };
  });
  await db.trips.bulkPut(cached);
}

export async function getCachedTrip(tripId: string): Promise<CachedTrip | undefined> {
  return db.trips.get(tripId);
}

export async function getCachedTrips(): Promise<CachedTrip[]> {
  return db.trips.toArray();
}

export async function getCachedUserTrips(userId: string): Promise<CachedTrip[]> {
  // Get trips where user is creator or member
  const [createdTrips, memberTrips] = await Promise.all([
    db.trips.where('created_by').equals(userId).toArray(),
    db.trip_members.where('user_id').equals(userId).toArray(),
  ]);

  // Get trip IDs from memberships
  const memberTripIds = memberTrips.map((m) => m.trip_id);

  // Combine and deduplicate
  const allTripIds = new Set([...createdTrips.map((t) => t.id), ...memberTripIds]);

  // Fetch all trips
  const trips = await db.trips.bulkGet(Array.from(allTripIds));
  return trips.filter((t): t is CachedTrip => t !== undefined);
}

// ========== TRIP MEMBERS ==========

export async function cacheTripMembers(tripId: string, members: TripMember[]): Promise<void> {
  const cached = members.map((member) => ({
    ...member,
    _syncStatus: 'synced' as const,
    _lastSyncedAt: new Date().toISOString(),
  }));
  await db.trip_members.bulkPut(cached);
}

export async function getCachedTripMembers(tripId: string): Promise<CachedTripMember[]> {
  return db.trip_members.where('trip_id').equals(tripId).toArray();
}

// ========== ACTIVITIES ==========

export async function cacheActivities(tripId: string, activities: Activity[]): Promise<void> {
  const cached = activities.map((activity) => ({
    ...activity,
    // Serialize links to JSON string for IndexedDB
    links: activity.links ? JSON.stringify(activity.links) : null,
    _syncStatus: 'synced' as const,
    _lastSyncedAt: new Date().toISOString(),
  }));
  await db.activities.bulkPut(cached);
}

export async function getCachedActivities(tripId: string): Promise<Activity[]> {
  const cached = await db.activities.where('trip_id').equals(tripId).toArray();

  // Deserialize links back to objects
  return cached.map((activity) => ({
    ...activity,
    links: activity.links ? JSON.parse(activity.links) : null,
  })) as Activity[];
}

export async function getCachedActivitiesByDate(tripId: string, date: string): Promise<Activity[]> {
  const cached = await db.activities.where('[trip_id+date]').equals([tripId, date]).toArray();

  return cached.map((activity) => ({
    ...activity,
    links: activity.links ? JSON.parse(activity.links) : null,
  })) as Activity[];
}

// ========== EXPENSES ==========

export async function cacheExpenses(tripId: string, expenses: Expense[]): Promise<void> {
  const cached = expenses.map((expense) => ({
    ...expense,
    _syncStatus: 'synced' as const,
    _lastSyncedAt: new Date().toISOString(),
  }));
  await db.expenses.bulkPut(cached);
}

export async function getCachedExpenses(tripId: string): Promise<CachedExpense[]> {
  return db.expenses.where('trip_id').equals(tripId).toArray();
}

// ========== EXPENSE SPLITS ==========

export async function cacheExpenseSplits(
  expenseId: string,
  splits: Array<{
    id: string;
    expense_id: string;
    user_id: string;
    amount: number;
    percentage: number | null;
    created_at?: string;
  }>
): Promise<void> {
  const cached = splits.map((split) => ({
    ...split,
    created_at: split.created_at || new Date().toISOString(),
    _syncStatus: 'synced' as const,
    _lastSyncedAt: new Date().toISOString(),
  })) as CachedExpenseSplit[];
  await db.expense_splits.bulkPut(cached);
}

export async function getCachedExpenseSplits(expenseId: string): Promise<CachedExpenseSplit[]> {
  return db.expense_splits.where('expense_id').equals(expenseId).toArray();
}

// ========== TRIP NOTES ==========

export async function cacheTripNotes(tripId: string, notes: TripNote[]): Promise<void> {
  const cached = notes.map((note) => ({
    ...note,
    _syncStatus: 'synced' as const,
    _lastSyncedAt: new Date().toISOString(),
  }));
  await db.trip_notes.bulkPut(cached);
}

export async function getCachedTripNotes(tripId: string): Promise<CachedTripNote[]> {
  return db.trip_notes.where('trip_id').equals(tripId).toArray();
}

// ========== USERS ==========

export async function cacheUser(user: {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}): Promise<void> {
  const cached = {
    ...user,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
    _syncStatus: 'synced' as const,
    _lastSyncedAt: new Date().toISOString(),
  } as CachedUser;
  await db.users.put(cached);
}

export async function cacheUsers(
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    created_at?: string;
    updated_at?: string;
  }>
): Promise<void> {
  const now = new Date().toISOString();
  const cached = users.map((user) => ({
    ...user,
    created_at: user.created_at || now,
    updated_at: user.updated_at || now,
    _syncStatus: 'synced' as const,
    _lastSyncedAt: now,
  })) as CachedUser[];
  await db.users.bulkPut(cached);
}

export async function getCachedUser(userId: string): Promise<CachedUser | undefined> {
  return db.users.get(userId);
}

// ========== TRIP DATA BUNDLE ==========

/**
 * Cache all data for a trip in one operation
 */
export async function cacheTripBundle(data: {
  trip: Trip;
  members: TripMember[];
  activities: Activity[];
  expenses: Expense[];
  expenseSplits: Array<{
    id: string;
    expense_id: string;
    user_id: string;
    amount: number;
    percentage: number | null;
  }>;
  notes: TripNote[];
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  }>;
}): Promise<void> {
  await Promise.all([
    cacheTrip(data.trip),
    cacheTripMembers(data.trip.id, data.members),
    cacheActivities(data.trip.id, data.activities),
    cacheExpenses(data.trip.id, data.expenses),
    data.expenseSplits.length > 0
      ? Promise.all(
          // Group splits by expense_id
          Object.entries(
            data.expenseSplits.reduce(
              (acc, split) => {
                if (!acc[split.expense_id]) {
                  acc[split.expense_id] = [];
                }
                acc[split.expense_id].push(split);
                return acc;
              },
              {} as Record<string, typeof data.expenseSplits>
            )
          ).map(([expenseId, splits]) => cacheExpenseSplits(expenseId, splits))
        )
      : Promise.resolve(),
    cacheTripNotes(data.trip.id, data.notes),
    cacheUsers(data.users),
  ]);
}

/**
 * Get all cached data for a trip
 */
export async function getCachedTripBundle(tripId: string) {
  const [trip, members, activities, expenses, notes] = await Promise.all([
    getCachedTrip(tripId),
    getCachedTripMembers(tripId),
    getCachedActivities(tripId),
    getCachedExpenses(tripId),
    getCachedTripNotes(tripId),
  ]);

  if (!trip) {
    return null;
  }

  // Get expense splits for all expenses
  const expenseSplits =
    expenses.length > 0
      ? await Promise.all(expenses.map((expense) => getCachedExpenseSplits(expense.id))).then(
          (results) => results.flat()
        )
      : [];

  // Get user IDs from members
  const userIds = [...new Set(members.map((m) => m.user_id))];
  const users = await db.users.bulkGet(userIds);

  return {
    trip,
    members,
    activities,
    expenses,
    expenseSplits,
    notes,
    users: users.filter((u): u is CachedUser => u !== undefined),
  };
}

// ========== CACHE STATUS ==========

export async function getLastSyncTime(tripId: string): Promise<string | null> {
  const trip = await getCachedTrip(tripId);
  return trip?._lastSyncedAt ?? null;
}

export async function isTripCached(tripId: string): Promise<boolean> {
  const trip = await getCachedTrip(tripId);
  return trip !== undefined;
}
