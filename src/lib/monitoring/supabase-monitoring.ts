/**
 * Supabase-specific monitoring utilities
 *
 * This module provides monitoring and performance tracking
 * for all Supabase operations (database, auth, storage, realtime).
 */

import { logError, logInfo, logWarning } from '@/lib/errors/logger';
import { supabaseMetrics } from './index';

/**
 * Wrap a Supabase query with monitoring
 */
export async function monitorSupabaseQuery<T>(
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete',
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  let success = false;

  try {
    const result = await queryFn();
    success = true;
    return result;
  } catch (error) {
    logError(`Supabase ${operation} failed on ${table}`, { error });
    throw error;
  } finally {
    const duration = performance.now() - startTime;
    supabaseMetrics.trackQuery(table, operation, duration, success);
  }
}

/**
 * Supabase RLS (Row Level Security) monitoring
 * Tracks when queries fail due to RLS policies
 */
export function trackRlsViolation(
  table: string,
  operation: string,
  userId?: string,
  tripId?: string
): void {
  logWarning('RLS policy violation detected', {
    table,
    operation,
    userId,
    tripId,
  });

  // In production, you'd want to track these to identify:
  // 1. Broken permission checks in the UI
  // 2. Potential security issues
  // 3. UX improvements needed
}

/**
 * Monitor Supabase Auth operations
 */
export const authMetrics = {
  trackSignIn(method: 'email' | 'oauth', success: boolean, duration: number): void {
    logInfo('Auth sign in', { method, success, duration });
  },

  trackSignUp(success: boolean, duration: number): void {
    logInfo('Auth sign up', { success, duration });
  },

  trackSignOut(success: boolean): void {
    logInfo('Auth sign out', { success });
  },

  trackPasswordReset(success: boolean): void {
    logInfo('Password reset', { success });
  },
};

/**
 * Monitor Supabase Storage operations
 */
export async function monitorStorageOperation<T>(
  operation: 'upload' | 'download' | 'delete',
  bucket: string,
  filePath: string,
  operationFn: () => Promise<T>,
  fileSize?: number
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await operationFn();
    const duration = performance.now() - startTime;
    supabaseMetrics.trackStorage(operation, bucket, duration, fileSize);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logError(`Storage ${operation} failed`, {
      bucket,
      filePath,
      fileSize,
      duration,
      error,
    });
    throw error;
  }
}

/**
 * Supabase connection health check
 */
export async function checkSupabaseHealth(): Promise<{
  database: boolean;
  auth: boolean;
  storage: boolean;
  realtime: boolean;
}> {
  const health = {
    database: false,
    auth: false,
    storage: false,
    realtime: false,
  };

  try {
    // In a real implementation, you'd perform actual health checks
    // For now, we assume they're healthy if we can import the client
    await import('@supabase/supabase-js');
    health.database = true;
    health.auth = true;
    health.storage = true;
    health.realtime = true;
  } catch (error) {
    logError(error, { action: 'supabase_health_check' });
  }

  return health;
}

/**
 * Track slow queries (queries taking longer than threshold)
 */
export function trackSlowQuery(
  table: string,
  operation: string,
  duration: number,
  threshold = 2000
): void {
  if (duration > threshold) {
    logWarning('Slow Supabase query detected', {
      table,
      operation,
      duration,
      threshold,
    });

    // In production, you'd want to:
    // 1. Alert the team if queries are consistently slow
    // 2. Identify which queries need optimization
    // 3. Check if indexes are missing
  }
}

/**
 * Supabase Realtime monitoring
 */
export class RealtimeMonitor {
  private connectionStartTime: number | null = null;
  private messageCount = 0;
  private errorCount = 0;

  onConnect(): void {
    this.connectionStartTime = Date.now();
    supabaseMetrics.trackRealtime('connected');
    logInfo('Realtime connection established');
  }

  onDisconnect(): void {
    const connectionDuration = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;

    supabaseMetrics.trackRealtime('disconnected');
    logInfo('Realtime connection closed', {
      duration: connectionDuration,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
    });

    this.connectionStartTime = null;
    this.messageCount = 0;
    this.errorCount = 0;
  }

  onMessage(table: string, event: string): void {
    this.messageCount++;
    logInfo('Realtime message received', { table, event, total: this.messageCount });
  }

  onError(error: Error): void {
    this.errorCount++;
    supabaseMetrics.trackRealtime('error');
    logError('Realtime error', { error, errorCount: this.errorCount });
  }
}

/**
 * Database query performance insights
 */
export interface QueryPerformanceInsight {
  table: string;
  operation: string;
  avgDuration: number;
  maxDuration: number;
  count: number;
  lastExecuted: number;
}

/**
 * Track query performance over time (in-memory for now)
 * In production, this would be stored and aggregated in a monitoring service
 */
class QueryPerformanceTracker {
  private queryStats = new Map<string, QueryPerformanceInsight>();

  track(table: string, operation: string, duration: number): void {
    const key = `${table}.${operation}`;
    const existing = this.queryStats.get(key);

    if (existing) {
      const count = existing.count + 1;
      const avgDuration = (existing.avgDuration * existing.count + duration) / count;
      const maxDuration = Math.max(existing.maxDuration, duration);

      this.queryStats.set(key, {
        table,
        operation,
        avgDuration,
        maxDuration,
        count,
        lastExecuted: Date.now(),
      });
    } else {
      this.queryStats.set(key, {
        table,
        operation,
        avgDuration: duration,
        maxDuration: duration,
        count: 1,
        lastExecuted: Date.now(),
      });
    }
  }

  getStats(): QueryPerformanceInsight[] {
    return Array.from(this.queryStats.values()).sort((a, b) => b.maxDuration - a.maxDuration);
  }

  getSlowestQueries(limit = 10): QueryPerformanceInsight[] {
    return this.getStats().slice(0, limit);
  }

  clear(): void {
    this.queryStats.clear();
  }
}

export const queryPerformanceTracker = new QueryPerformanceTracker();
