'use client';

import { useEffect } from 'react';
import { useTripContext } from '@/hooks/use-trip-context';

export function TripContextSetter({ tripName }: { tripName: string }) {
  const setTripName = useTripContext((s) => s.setTripName);

  useEffect(() => {
    setTripName(tripName);
    return () => setTripName(null);
  }, [tripName, setTripName]);

  return null;
}
