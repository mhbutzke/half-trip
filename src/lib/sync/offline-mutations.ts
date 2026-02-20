import { db, CachedActivity, CachedExpense, CachedTripNote, CachedTrip } from './db';
import type { Database } from '@/types/database';

type ActivityInsert = Database['public']['Tables']['activities']['Insert'];
type ActivityUpdate = Database['public']['Tables']['activities']['Update'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];
type TripNoteInsert = Database['public']['Tables']['trip_notes']['Insert'];
type TripNoteUpdate = Database['public']['Tables']['trip_notes']['Update'];
type TripUpdate = Database['public']['Tables']['trips']['Update'];

const now = () => new Date().toISOString();

/**
 * Enqueue a sync operation with deduplication.
 * If a pending entry already exists for the same table+recordId,
 * it is replaced instead of creating a duplicate.
 * This prevents duplicate operations if the user edits the same
 * record multiple times offline before syncing.
 */
async function enqueueSync(entry: {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  recordId: string;
  data: unknown;
}): Promise<void> {
  const existing = await db.sync_queue
    .where('[table+recordId]')
    .equals([entry.table, entry.recordId])
    .first();

  if (existing) {
    // Replace existing entry: keep the newer operation
    // insert + update = insert (with updated data)
    // insert + delete = remove queue entry entirely (cancel both)
    // update + update = update (with latest data)
    // update + delete = delete
    // delete + anything = shouldn't happen (record already deleted locally)
    if (existing.operation === 'insert' && entry.operation === 'delete') {
      // Record was created then deleted offline — cancel both, never sync
      await db.sync_queue.delete(existing.id!);
      return;
    }

    const mergedOperation = existing.operation === 'insert' ? 'insert' : entry.operation;

    await db.sync_queue.update(existing.id!, {
      operation: mergedOperation,
      data: entry.data,
      timestamp: now(),
      retries: 0,
      error: undefined,
    });
  } else {
    await db.sync_queue.add({
      ...entry,
      timestamp: now(),
      retries: 0,
      error: undefined,
    });
  }
}

/**
 * Create activity offline
 * Stores in IndexedDB and adds to sync queue
 */
export async function createActivityOffline(
  data: ActivityInsert & { id: string }
): Promise<CachedActivity> {
  const cachedActivity: CachedActivity = {
    id: data.id,
    trip_id: data.trip_id,
    title: data.title,
    category: data.category,
    date: data.date,
    start_time: data.start_time ?? null,
    duration_minutes: data.duration_minutes ?? null,
    location: data.location ?? null,
    description: data.description ?? null,
    links: data.links ? JSON.stringify(data.links) : null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : '{}',
    sort_order: data.sort_order ?? 0,
    created_by: data.created_by,
    created_at: now(),
    updated_at: now(),
    _syncStatus: 'pending',
    _lastSyncedAt: undefined,
    _syncError: undefined,
    _locallyModifiedAt: now(),
  };

  // Add to cache
  await db.activities.add(cachedActivity);

  // Add to sync queue
  await enqueueSync({
    table: 'activities',
    operation: 'insert',
    recordId: data.id,
    data: cachedActivity,
  });

  return cachedActivity;
}

/**
 * Update activity offline
 */
export async function updateActivityOffline(
  id: string,
  data: Partial<ActivityUpdate>
): Promise<void> {
  const existing = await db.activities.get(id);
  if (!existing) {
    throw new Error(`Activity ${id} not found in cache`);
  }

  const updated: Partial<CachedActivity> = {
    ...data,
    links: data.links ? JSON.stringify(data.links) : existing.links,
    metadata: data.metadata ? JSON.stringify(data.metadata) : existing.metadata,
    updated_at: now(),
    _syncStatus: 'pending',
    _locallyModifiedAt: now(),
  };

  // Update cache
  await db.activities.update(id, updated);

  // Add to sync queue
  await enqueueSync({
    table: 'activities',
    operation: 'update',
    recordId: id,
    data: { id, ...updated },
  });
}

/**
 * Delete activity offline
 */
export async function deleteActivityOffline(id: string): Promise<void> {
  // Mark as pending delete in cache (don't actually delete yet)
  await db.activities.update(id, {
    _syncStatus: 'pending',
    _locallyModifiedAt: now(),
  });

  // Add to sync queue
  await enqueueSync({
    table: 'activities',
    operation: 'delete',
    recordId: id,
    data: { id },
  });
}

/**
 * Create expense offline
 */
export async function createExpenseOffline(
  data: ExpenseInsert & { id: string }
): Promise<CachedExpense> {
  const cachedExpense: CachedExpense = {
    id: data.id,
    trip_id: data.trip_id,
    description: data.description,
    amount: data.amount,
    currency: data.currency ?? 'BRL',
    exchange_rate: data.exchange_rate ?? 1,
    category: data.category,
    date: data.date,
    paid_by: data.paid_by ?? null,
    paid_by_participant_id: data.paid_by_participant_id ?? null,
    receipt_url: data.receipt_url ?? null,
    notes: data.notes ?? null,
    created_by: data.created_by,
    created_at: now(),
    updated_at: now(),
    _syncStatus: 'pending',
    _lastSyncedAt: undefined,
    _syncError: undefined,
    _locallyModifiedAt: now(),
  };

  // Add to cache
  await db.expenses.add(cachedExpense);

  // Add to sync queue
  await enqueueSync({
    table: 'expenses',
    operation: 'insert',
    recordId: data.id,
    data: cachedExpense,
  });

  return cachedExpense;
}

/**
 * Update expense offline
 */
export async function updateExpenseOffline(
  id: string,
  data: Partial<ExpenseUpdate>
): Promise<void> {
  const updated: Partial<CachedExpense> = {
    ...data,
    updated_at: now(),
    _syncStatus: 'pending',
    _locallyModifiedAt: now(),
  };

  // Update cache
  await db.expenses.update(id, updated);

  // Add to sync queue
  await enqueueSync({
    table: 'expenses',
    operation: 'update',
    recordId: id,
    data: { id, ...updated },
  });
}

/**
 * Delete expense offline
 */
export async function deleteExpenseOffline(id: string): Promise<void> {
  // Mark as pending delete in cache
  await db.expenses.update(id, {
    _syncStatus: 'pending',
    _locallyModifiedAt: now(),
  });

  // Add to sync queue
  await enqueueSync({
    table: 'expenses',
    operation: 'delete',
    recordId: id,
    data: { id },
  });
}

/**
 * Create trip note offline
 */
export async function createTripNoteOffline(
  data: TripNoteInsert & { id: string }
): Promise<CachedTripNote> {
  const cachedNote: CachedTripNote = {
    id: data.id,
    trip_id: data.trip_id,
    content: data.content,
    created_by: data.created_by,
    created_at: now(),
    updated_at: now(),
    _syncStatus: 'pending',
    _lastSyncedAt: undefined,
    _syncError: undefined,
    _locallyModifiedAt: now(),
  };

  // Add to cache
  await db.trip_notes.add(cachedNote);

  // Add to sync queue
  await enqueueSync({
    table: 'trip_notes',
    operation: 'insert',
    recordId: data.id,
    data: cachedNote,
  });

  return cachedNote;
}

/**
 * Update trip note offline
 */
export async function updateTripNoteOffline(
  id: string,
  data: Partial<TripNoteUpdate>
): Promise<void> {
  const updated: Partial<CachedTripNote> = {
    ...data,
    updated_at: now(),
    _syncStatus: 'pending',
    _locallyModifiedAt: now(),
  };

  // Update cache
  await db.trip_notes.update(id, updated);

  // Add to sync queue
  await enqueueSync({
    table: 'trip_notes',
    operation: 'update',
    recordId: id,
    data: { id, ...updated },
  });
}

/**
 * Delete trip note offline
 */
export async function deleteTripNoteOffline(id: string): Promise<void> {
  // Mark as pending delete in cache
  await db.trip_notes.update(id, {
    _syncStatus: 'pending',
    _locallyModifiedAt: now(),
  });

  // Add to sync queue
  await enqueueSync({
    table: 'trip_notes',
    operation: 'delete',
    recordId: id,
    data: { id },
  });
}

/**
 * Update trip offline
 */
export async function updateTripOffline(id: string, data: Partial<TripUpdate>): Promise<void> {
  const updated: Partial<CachedTrip> = {
    ...data,
    updated_at: now(),
    _syncStatus: 'pending',
    _locallyModifiedAt: now(),
  };

  // Update cache
  await db.trips.update(id, updated);

  // Add to sync queue
  await enqueueSync({
    table: 'trips',
    operation: 'update',
    recordId: id,
    data: { id, ...updated },
  });
}

/**
 * Check if an entity is pending sync
 */
export async function isPendingSync(
  table: 'activities' | 'expenses' | 'trip_notes' | 'trips',
  id: string
): Promise<boolean> {
  let entity;
  switch (table) {
    case 'activities':
      entity = await db.activities.get(id);
      break;
    case 'expenses':
      entity = await db.expenses.get(id);
      break;
    case 'trip_notes':
      entity = await db.trip_notes.get(id);
      break;
    case 'trips':
      entity = await db.trips.get(id);
      break;
  }

  return entity?._syncStatus === 'pending';
}

/**
 * Get all entities with pending sync status
 */
export async function getPendingEntities(
  table: 'activities' | 'expenses' | 'trip_notes' | 'trips'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  switch (table) {
    case 'activities':
      return await db.activities.where('_syncStatus').equals('pending').toArray();
    case 'expenses':
      return await db.expenses.where('_syncStatus').equals('pending').toArray();
    case 'trip_notes':
      return await db.trip_notes.where('_syncStatus').equals('pending').toArray();
    case 'trips':
      return await db.trips.where('_syncStatus').equals('pending').toArray();
  }
}
