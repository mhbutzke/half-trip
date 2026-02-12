'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Hook to detect online/offline status
 * Uses useSyncExternalStore for React 19 compatibility.
 */
export function useOnlineStatus() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
      window.removeEventListener('online', callback);
      window.removeEventListener('offline', callback);
    };
  }, []);

  const getSnapshot = useCallback(() => navigator.onLine, []);
  const getServerSnapshot = useCallback(() => true, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Extended hook with pending sync queue count.
 */
export function useOnlineStatusExtended() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const { db } = await import('@/lib/sync/db');
        const count = await db.sync_queue.count();
        if (!cancelled) {
          requestAnimationFrame(() => setPendingCount(count));
        }
      } catch {
        // DB not available
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { isOnline, pendingCount };
}
