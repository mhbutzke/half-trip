'use client';

import { useEffect, useState } from 'react';
import { useOnlineStatus } from './use-online-status';
import { getCachedTripBundle, cacheTripBundle, getLastSyncTime, isTripCached } from '@/lib/sync';
import type {
  CachedTrip,
  CachedTripMember,
  CachedExpense,
  CachedExpenseSplit,
  CachedTripNote,
  CachedUser,
} from '@/lib/sync';
import type { Activity, Trip, TripMember, Expense, TripNote } from '@/types/database';

interface TripOfflineData {
  trip: CachedTrip;
  members: CachedTripMember[];
  activities: Activity[];
  expenses: CachedExpense[];
  expenseSplits: CachedExpenseSplit[];
  notes: CachedTripNote[];
  users: CachedUser[];
}

interface TripDataToCache {
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
}

interface UseTripOfflineOptions {
  /** Whether to automatically fetch from cache when offline */
  autoFetch?: boolean;
}

interface UseTripOfflineReturn {
  /** Cached data for the trip */
  data: TripOfflineData | null;
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Whether the app is currently offline */
  isOffline: boolean;
  /** Whether the trip has cached data available */
  isCached: boolean;
  /** Last sync timestamp (ISO string) */
  lastSyncTime: string | null;
  /** Error if any occurred */
  error: Error | null;
  /** Manually fetch cached data */
  fetchCached: () => Promise<void>;
  /** Cache fresh data from server */
  cacheData: (data: TripDataToCache) => Promise<void>;
}

/**
 * Hook for accessing trip data offline
 * Automatically fetches from cache when offline
 * Provides methods to cache fresh data when online
 */
export function useTripOffline(
  tripId: string | null,
  options: UseTripOfflineOptions = {}
): UseTripOfflineReturn {
  const { autoFetch = true } = options;
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;

  const [data, setData] = useState<TripOfflineData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Fetch cached data
  const fetchCached = async () => {
    if (!tripId) {
      setData(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const cachedData = await getCachedTripBundle(tripId);

      if (cachedData) {
        setData(cachedData);
        setIsCached(true);

        const syncTime = await getLastSyncTime(tripId);
        setLastSyncTime(syncTime);
      } else {
        setData(null);
        setIsCached(false);
        setLastSyncTime(null);
      }
    } catch (err) {
      console.error('Error fetching cached trip data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch cached data'));
    } finally {
      setIsLoading(false);
    }
  };

  // Cache fresh data from server
  const cacheData = async (freshData: TripDataToCache) => {
    if (!tripId) return;

    try {
      await cacheTripBundle({
        trip: freshData.trip,
        members: freshData.members,
        activities: freshData.activities,
        expenses: freshData.expenses,
        expenseSplits: freshData.expenseSplits,
        notes: freshData.notes,
        users: freshData.users,
      });

      const syncTime = new Date().toISOString();
      setLastSyncTime(syncTime);
      setIsCached(true);

      console.log(`[Offline] Cached trip ${tripId} data`);
    } catch (err) {
      console.error('Error caching trip data:', err);
    }
  };

  // Check if trip is cached on mount
  useEffect(() => {
    if (!tripId) return;

    isTripCached(tripId).then((cached) => {
      setIsCached(cached);
      if (cached) {
        getLastSyncTime(tripId).then(setLastSyncTime);
      }
    });
  }, [tripId]);

  // Auto-fetch cached data when offline
  useEffect(() => {
    if (!autoFetch || !tripId || !isOffline) return;

    fetchCached();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, tripId, isOffline]);

  return {
    data,
    isLoading,
    isOffline,
    isCached,
    lastSyncTime,
    error,
    fetchCached,
    cacheData,
  };
}
