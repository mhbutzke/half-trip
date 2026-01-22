'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect online/offline status
 * Listens to browser online/offline events and navigator.onLine
 */
export function useOnlineStatus() {
  // Initialize with navigator.onLine if available (client-side), otherwise true for SSR
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    // Event handlers
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
