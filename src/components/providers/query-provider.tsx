'use client';

/**
 * React Query Provider
 *
 * Wraps the app with React Query's QueryClientProvider for data caching
 * and synchronization.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Prevent refetching on window focus in development
            refetchOnWindowFocus: false,
            // Keep data for 5 minutes before marking as stale
            staleTime: 5 * 60 * 1000,
            // Retry failed queries once
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
