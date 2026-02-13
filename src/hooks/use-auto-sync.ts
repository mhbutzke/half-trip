'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from './use-online-status';
import { syncEngine, type SyncResult } from '@/lib/sync';
import { toast } from 'sonner';
import { notifications } from '@/lib/notifications';
import { logDebug, logError } from '@/lib/errors/logger';

type AutoSyncConfig = {
  enabled?: boolean;
  syncOnMount?: boolean;
  syncInterval?: number; // in milliseconds, 0 to disable periodic sync
};

type AutoSyncHook = {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncResult: SyncResult | null;
  pendingCount: number;
  sync: () => Promise<void>;
};

/**
 * Hook for automatic synchronization on network reconnect
 * Also provides manual sync trigger
 */
export function useAutoSync(config: AutoSyncConfig = {}): AutoSyncHook {
  const {
    enabled = true,
    syncOnMount = false,
    syncInterval = 0, // disabled by default
  } = config;

  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const wasOffline = useRef(!isOnline);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync function
  const sync = async () => {
    if (!isOnline || isSyncing) {
      return;
    }

    setIsSyncing(true);

    try {
      logDebug('AutoSync: Starting sync');
      const result = await syncEngine.processQueue();
      setLastSyncResult(result);
      setLastSyncTime(new Date());

      // Update pending count
      const count = await syncEngine.getPendingCount();
      setPendingCount(count);

      if (result.success || result.errors.length === 0) {
        if (result.processedCount > 0) {
          toast.success(
            `Sincronização concluída: ${result.processedCount} ${result.processedCount === 1 ? 'item' : 'itens'}`
          );
          notifications.syncCompleted({
            metadata: {
              processedCount: result.processedCount,
            },
          });
        }
        logDebug('AutoSync: Sync completed successfully');
      } else {
        // Categorize errors for better user feedback
        const retryableErrors = result.errors.filter((e) => e.retryable).length;
        const permanentErrors = result.errors.filter((e) => !e.retryable).length;

        if (permanentErrors > 0) {
          toast.error(
            `Erro na sincronização: ${permanentErrors} ${permanentErrors === 1 ? 'erro permanente' : 'erros permanentes'}. Verifique suas permissões.`
          );
          notifications.syncFailed({
            metadata: {
              errorCount: permanentErrors,
              retryableErrors,
            },
          });
        } else if (retryableErrors > 0) {
          toast.warning(
            `${retryableErrors} ${retryableErrors === 1 ? 'item' : 'itens'} não sincronizado${retryableErrors === 1 ? '' : 's'}. Tentando novamente...`
          );
        }
        logError('AutoSync: Sync completed with errors', {
          action: 'auto-sync',
          errors: JSON.stringify(result.errors),
        });
      }
    } catch (error) {
      logError(error, { action: 'auto-sync' });
      toast.error('Erro ao sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };

  // Update pending count on mount and when online status changes
  useEffect(() => {
    async function updatePendingCount() {
      const count = await syncEngine.getPendingCount();
      setPendingCount(count);
    }
    updatePendingCount();
  }, [isOnline]);

  // Sync on mount if enabled
  useEffect(() => {
    if (enabled && syncOnMount && isOnline) {
      sync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (enabled && isOnline && wasOffline.current) {
      logDebug('AutoSync: Network reconnected, syncing');
      sync();
    }
    wasOffline.current = !isOnline;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, enabled]);

  // Periodic sync
  useEffect(() => {
    if (enabled && syncInterval > 0 && isOnline) {
      intervalRef.current = setInterval(() => {
        logDebug('AutoSync: Periodic sync triggered');
        sync();
      }, syncInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, syncInterval, isOnline]);

  return {
    isSyncing,
    lastSyncTime,
    lastSyncResult,
    pendingCount,
    sync,
  };
}
