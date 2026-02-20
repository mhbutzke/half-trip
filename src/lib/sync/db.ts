import Dexie, { type EntityTable } from 'dexie';

/**
 * Sync status for offline-first data
 */
export type SyncStatus = 'synced' | 'pending' | 'error';

/**
 * Base interface for all synced entities
 */
export interface SyncMetadata {
  _syncStatus: SyncStatus;
  _syncError?: string;
  _lastSyncedAt?: string;
  _locallyModifiedAt?: string;
}

/**
 * Cached user data
 */
export interface CachedUser extends SyncMetadata {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Cached trip data
 */
export interface CachedTrip extends SyncMetadata {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description: string | null;
  cover_url: string | null;
  style: 'adventure' | 'relaxation' | 'cultural' | 'gastronomic' | 'other' | null;
  base_currency: string;
  transport_type: 'car' | 'plane' | 'bus' | 'mixed';
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Cached trip member data
 */
export interface CachedTripMember extends SyncMetadata {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'organizer' | 'participant';
  joined_at: string;
  invited_by: string | null;
}

/**
 * Cached activity data
 */
export interface CachedActivity extends SyncMetadata {
  id: string;
  trip_id: string;
  title: string;
  date: string;
  start_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  description: string | null;
  category: 'transport' | 'accommodation' | 'tour' | 'meal' | 'event' | 'other';
  links: string | null; // JSON serialized
  metadata: string | null; // JSON serialized
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cached expense data
 */
export interface CachedExpense extends SyncMetadata {
  id: string;
  trip_id: string;
  description: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  date: string;
  category: 'accommodation' | 'food' | 'transport' | 'tickets' | 'shopping' | 'other';
  paid_by: string | null;
  paid_by_participant_id: string | null;
  created_by: string;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Cached expense split data
 */
export interface CachedExpenseSplit extends SyncMetadata {
  id: string;
  expense_id: string;
  user_id: string | null;
  participant_id: string | null;
  amount: number;
  percentage: number | null;
  created_at: string;
}

/**
 * Cached trip note data
 */
export interface CachedTripNote extends SyncMetadata {
  id: string;
  trip_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cached trip budget data
 */
export interface CachedTripBudget extends SyncMetadata {
  id: string;
  trip_id: string;
  category: string;
  amount: number;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Sync queue entry for offline writes
 */
export interface SyncQueueEntry {
  id?: number; // Auto-incremented
  timestamp: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  recordId: string;
  data: unknown;
  retries: number;
  error?: string;
}

/**
 * Half Trip offline database
 */
export class HalfTripDB extends Dexie {
  // Tables
  users!: EntityTable<CachedUser, 'id'>;
  trips!: EntityTable<CachedTrip, 'id'>;
  trip_members!: EntityTable<CachedTripMember, 'id'>;
  activities!: EntityTable<CachedActivity, 'id'>;
  expenses!: EntityTable<CachedExpense, 'id'>;
  expense_splits!: EntityTable<CachedExpenseSplit, 'id'>;
  trip_notes!: EntityTable<CachedTripNote, 'id'>;
  trip_budgets!: EntityTable<CachedTripBudget, 'id'>;
  sync_queue!: EntityTable<SyncQueueEntry, 'id'>;

  constructor() {
    super('HalfTripDB');

    this.version(5).stores({
      users: 'id, email, name',
      trips: 'id, created_by, start_date, end_date, archived_at',
      trip_members: 'id, trip_id, user_id, [trip_id+user_id]',
      activities: 'id, trip_id, date, [trip_id+date], created_by, sort_order',
      expenses: 'id, trip_id, date, category, paid_by, paid_by_participant_id, created_by',
      expense_splits: 'id, expense_id, user_id, participant_id, [expense_id+user_id]',
      trip_notes: 'id, trip_id, created_by, created_at',
      trip_budgets: 'id, trip_id, category, [trip_id+category]',
      sync_queue: '++id, timestamp, table, operation, recordId',
    });

    // v6: Add compound index [table+recordId] to sync_queue for dedup lookups
    this.version(6).stores({
      sync_queue: '++id, timestamp, table, operation, recordId, [table+recordId]',
    });
  }
}

// Create singleton instance
export const db = new HalfTripDB();

/**
 * Initialize the database and perform any necessary setup
 */
export async function initializeDB(): Promise<void> {
  try {
    // Open the database
    await db.open();
    console.log('[IndexedDB] Database initialized successfully');
  } catch (error) {
    console.error('[IndexedDB] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Clear all cached data (useful for logout or debugging)
 */
export async function clearAllCache(): Promise<void> {
  try {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });
    console.log('[IndexedDB] All cache cleared');
  } catch (error) {
    console.error('[IndexedDB] Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const [
      userCount,
      tripCount,
      memberCount,
      activityCount,
      expenseCount,
      splitCount,
      noteCount,
      queueCount,
    ] = await Promise.all([
      db.users.count(),
      db.trips.count(),
      db.trip_members.count(),
      db.activities.count(),
      db.expenses.count(),
      db.expense_splits.count(),
      db.trip_notes.count(),
      db.sync_queue.count(),
    ]);

    return {
      users: userCount,
      trips: tripCount,
      trip_members: memberCount,
      activities: activityCount,
      expenses: expenseCount,
      expense_splits: splitCount,
      trip_notes: noteCount,
      sync_queue: queueCount,
      total:
        userCount +
        tripCount +
        memberCount +
        activityCount +
        expenseCount +
        splitCount +
        noteCount +
        queueCount,
    };
  } catch (error) {
    console.error('[IndexedDB] Failed to get database stats:', error);
    throw error;
  }
}

/**
 * Delete the entire database (for debugging or full reset)
 */
export async function deleteDatabase(): Promise<void> {
  try {
    await db.delete();
    console.log('[IndexedDB] Database deleted');
  } catch (error) {
    console.error('[IndexedDB] Failed to delete database:', error);
    throw error;
  }
}
