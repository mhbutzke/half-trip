'use client';

import { useState, useEffect } from 'react';
import { isPendingSync } from '@/lib/sync';
import { logError } from '@/lib/errors/logger';

type EntityTable = 'activities' | 'expenses' | 'trip_notes' | 'trips';

type SyncStatusHook = {
  isPending: boolean;
  isLoading: boolean;
  refresh: () => void;
};

/**
 * Hook to check if an entity has pending sync operations
 */
export function useSyncStatus(table: EntityTable, id: string | undefined): SyncStatusHook {
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setIsPending(false);
      return;
    }

    let isMounted = true;

    async function checkStatus() {
      if (!id) return;

      setIsLoading(true);
      try {
        const pending = await isPendingSync(table, id);
        if (isMounted) {
          setIsPending(pending);
        }
      } catch (error) {
        logError(error, { action: 'check-sync-status', table, id });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [table, id, refreshTrigger]);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  return { isPending, isLoading, refresh };
}
