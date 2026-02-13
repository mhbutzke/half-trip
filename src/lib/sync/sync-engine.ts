import { db, SyncQueueEntry } from './db';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { logWarning, logError, logDebug, logInfo } from '@/lib/errors/logger';

type TableName = keyof Database['public']['Tables'];

export type SyncErrorType = 'network' | 'permission' | 'validation' | 'conflict' | 'unknown';

export type SyncError = {
  id: number;
  table: string;
  operation: string;
  error: string;
  errorType: SyncErrorType;
  retryable: boolean;
};

export type SyncResult = {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: SyncError[];
};

/**
 * Sync engine for processing offline write queue
 * Handles syncing local changes to Supabase when online
 */
export class SyncEngine {
  private isProcessing = false;
  private maxRetries = 3;

  /**
   * Convert cached payloads to the shape expected by Supabase.
   * Some cached fields are JSON-serialized for IndexedDB compatibility.
   */
  private normalizeDataForTable(
    table: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>
  ) {
    if (table !== 'activities') {
      return data;
    }

    const normalized = { ...data };

    if (typeof normalized.links === 'string') {
      try {
        normalized.links = JSON.parse(normalized.links);
      } catch {
        normalized.links = [];
      }
    }

    if (typeof normalized.metadata === 'string') {
      try {
        normalized.metadata = JSON.parse(normalized.metadata);
      } catch {
        normalized.metadata = {};
      }
    }

    return normalized;
  }

  /**
   * Categorize error and determine if it's retryable
   */
  private categorizeError(error: unknown): { type: SyncErrorType; retryable: boolean } {
    const errorMessage =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    // Network errors - retryable
    if (
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection')
    ) {
      return { type: 'network', retryable: true };
    }

    // Permission errors - not retryable
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('rls')
    ) {
      return { type: 'permission', retryable: false };
    }

    // Validation errors - not retryable
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('constraint') ||
      errorMessage.includes('check violation')
    ) {
      return { type: 'validation', retryable: false };
    }

    // Conflict errors - already handled, but log them
    if (errorMessage.includes('conflict') || errorMessage.includes('duplicate')) {
      return { type: 'conflict', retryable: true };
    }

    // Unknown errors - retryable (cautious approach)
    return { type: 'unknown', retryable: true };
  }

  /**
   * Process the entire sync queue
   * Returns statistics about the sync operation
   */
  async processQueue(): Promise<SyncResult> {
    if (this.isProcessing) {
      logWarning('SyncEngine: Already processing queue, skipping', { action: 'sync-queue' });
      return {
        success: false,
        processedCount: 0,
        errorCount: 0,
        errors: [],
      };
    }

    this.isProcessing = true;

    try {
      const supabase = createClient();

      // Get all pending queue entries, ordered by timestamp (FIFO)
      const queueEntries = await db.sync_queue.orderBy('timestamp').toArray();

      if (queueEntries.length === 0) {
        logDebug('SyncEngine: Queue is empty');
        return {
          success: true,
          processedCount: 0,
          errorCount: 0,
          errors: [],
        };
      }

      logDebug(`SyncEngine: Processing ${queueEntries.length} queue entries`);

      let processedCount = 0;
      let errorCount = 0;
      const errors: SyncError[] = [];

      // Process each entry in order
      for (const entry of queueEntries) {
        try {
          await this.processSingleEntry(entry, supabase);
          processedCount++;

          // Remove from queue after successful sync
          await db.sync_queue.delete(entry.id!);

          // Update cached entity's sync status
          await this.updateCacheAfterSync(entry);
        } catch (error) {
          logError(error, { action: 'sync-process-entry', entryId: String(entry.id) });
          errorCount++;

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const { type: errorType, retryable } = this.categorizeError(error);

          errors.push({
            id: entry.id!,
            table: entry.table,
            operation: entry.operation,
            error: errorMessage,
            errorType,
            retryable,
          });

          // Increment retry count
          const newRetries = entry.retries + 1;

          // Only retry if error is retryable and we haven't exceeded max retries
          if (!retryable || newRetries >= this.maxRetries) {
            // Mark as permanently failed
            await db.sync_queue.update(entry.id!, {
              retries: newRetries,
              error: `[${errorType}] ${errorMessage}`,
            });
            logError(
              `SyncEngine: Entry ${entry.id} failed permanently (${errorType}): ${errorMessage}`,
              { action: 'sync-permanent-failure' }
            );
          } else {
            // Increment retry count for retryable errors
            await db.sync_queue.update(entry.id!, {
              retries: newRetries,
              error: `[${errorType}] ${errorMessage}`,
            });
            logWarning(
              `SyncEngine: Entry ${entry.id} will retry (attempt ${newRetries}/${this.maxRetries})`,
              { action: 'sync-retry' }
            );
          }
        }
      }

      logInfo(`SyncEngine: Sync complete: ${processedCount} processed, ${errorCount} errors`);

      return {
        success: errorCount === 0,
        processedCount,
        errorCount,
        errors,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single sync queue entry
   */
  private async processSingleEntry(
    entry: SyncQueueEntry,
    supabase: ReturnType<typeof createClient>
  ): Promise<void> {
    const { table, operation, data } = entry;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logDebug(`SyncEngine: Processing ${operation} on ${table}: ${(data as any).id}`);

    switch (operation) {
      case 'insert':
        await this.handleInsert(table, data, supabase);
        break;
      case 'update':
        await this.handleUpdate(table, data, supabase);
        break;
      case 'delete':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.handleDelete(table, (data as any).id, supabase);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Handle INSERT operation
   * Handles duplicate key errors by converting to UPDATE
   */
  private async handleInsert(
    table: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    supabase: ReturnType<typeof createClient>
  ): Promise<void> {
    // Remove sync metadata fields before inserting
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _syncStatus, _lastSyncedAt, _syncError, _locallyModifiedAt, ...insertData } = data;

    const normalizedInsertData = this.normalizeDataForTable(table, insertData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from(table as TableName).insert(normalizedInsertData as any);

    if (error) {
      // Check if this is a duplicate key error (record already exists)
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        logWarning(
          `SyncEngine: Record ${insertData.id} already exists in ${table}, converting to UPDATE`,
          { action: 'sync-insert-to-update' }
        );
        // Convert to update operation
        await this.handleUpdate(table, data, supabase);
        return;
      }
      throw new Error(`Insert failed: ${error.message}`);
    }

    logDebug(`SyncEngine: Successfully inserted ${table}:${normalizedInsertData.id}`);
  }

  /**
   * Handle UPDATE operation with conflict resolution
   * Uses last-write-wins strategy based on updated_at timestamp
   */
  private async handleUpdate(
    table: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    supabase: ReturnType<typeof createClient>
  ): Promise<void> {
    // Remove sync metadata fields before updating
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, _syncStatus, _lastSyncedAt, _syncError, _locallyModifiedAt, ...updateData } = data;

    // First, check if the remote version exists
    const { data: remoteData, error: fetchError } = await supabase
      .from(table as TableName)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      // If record doesn't exist remotely, it might have been deleted
      if (fetchError.code === 'PGRST116') {
        throw new Error('Record not found - may have been deleted remotely');
      }
      throw new Error(`Fetch failed: ${fetchError.message}`);
    }

    // Conflict detection: compare timestamps if available
    if (remoteData && 'updated_at' in remoteData && _locallyModifiedAt) {
      const remoteUpdatedAt = new Date(remoteData.updated_at as string);
      const localUpdatedAt = new Date(_locallyModifiedAt);

      // If remote is newer than our local modification, we have a conflict
      if (remoteUpdatedAt > localUpdatedAt) {
        logWarning(
          `SyncEngine: Conflict detected for ${table}:${id} - remote version is newer. Applying last-write-wins.`,
          { action: 'sync-conflict' }
        );
        // Last-write-wins: proceed with update anyway, overwriting remote changes
      }
    }

    const normalizedUpdateData = this.normalizeDataForTable(table, updateData);

    const { error } = await supabase
      .from(table as TableName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(normalizedUpdateData as any)
      .eq('id', id);

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }

    logDebug(`SyncEngine: Successfully updated ${table}:${id}`);
  }

  /**
   * Handle DELETE operation
   * Gracefully handles already-deleted records
   */
  private async handleDelete(
    table: string,
    id: string,
    supabase: ReturnType<typeof createClient>
  ): Promise<void> {
    const { error, data } = await supabase
      .from(table as TableName)
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logWarning(`SyncEngine: Record ${id} not found in ${table} - may have been already deleted`, {
        action: 'sync-delete',
      });
      // Not an error - record is already deleted, which is the desired end state
    } else {
      logDebug(`SyncEngine: Successfully deleted ${table}:${id}`);
    }
  }

  /**
   * Update cached entity's sync status after successful sync
   */
  private async updateCacheAfterSync(entry: SyncQueueEntry): Promise<void> {
    const { table, data, operation } = entry;
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyData = data as any;

    // For DELETE operations, remove from cache
    if (operation === 'delete') {
      switch (table) {
        case 'trips':
          await db.trips.delete(anyData.id);
          break;
        case 'activities':
          await db.activities.delete(anyData.id);
          break;
        case 'expenses':
          await db.expenses.delete(anyData.id);
          break;
        case 'trip_notes':
          await db.trip_notes.delete(anyData.id);
          break;
      }
      return;
    }

    // For INSERT/UPDATE, mark as synced
    const updateFields = {
      _syncStatus: 'synced' as const,
      _lastSyncedAt: now,
      _syncError: undefined,
    };

    switch (table) {
      case 'trips':
        await db.trips.update(anyData.id, updateFields);
        break;
      case 'activities':
        await db.activities.update(anyData.id, updateFields);
        break;
      case 'expenses':
        await db.expenses.update(anyData.id, updateFields);
        break;
      case 'trip_notes':
        await db.trip_notes.update(anyData.id, updateFields);
        break;
      default:
        logWarning(`SyncEngine: Unknown table for cache update: ${table}`, {
          action: 'sync-cache-update',
        });
    }
  }

  /**
   * Get count of pending sync queue entries
   */
  async getPendingCount(): Promise<number> {
    return await db.sync_queue.count();
  }

  /**
   * Get count of failed sync queue entries
   */
  async getFailedCount(): Promise<number> {
    return await db.sync_queue.filter((entry) => entry.retries >= this.maxRetries).count();
  }

  /**
   * Clear failed entries from the queue
   */
  async clearFailedEntries(): Promise<number> {
    const failedEntries = await db.sync_queue
      .filter((entry) => entry.retries >= this.maxRetries)
      .toArray();

    for (const entry of failedEntries) {
      await db.sync_queue.delete(entry.id!);
    }

    return failedEntries.length;
  }

  /**
   * Retry all failed entries (reset retry count)
   */
  async retryFailedEntries(): Promise<number> {
    const failedEntries = await db.sync_queue
      .filter((entry) => entry.retries >= this.maxRetries)
      .toArray();

    for (const entry of failedEntries) {
      await db.sync_queue.update(entry.id!, {
        retries: 0,
        error: undefined,
      });
    }

    return failedEntries.length;
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
