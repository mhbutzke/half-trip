'use client';

import { useQuery } from '@tanstack/react-query';

export type PlaceDetailsData = {
  place_id: string;
  name: string | null;
  formatted_address: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  website: string | null;
  formatted_phone_number: string | null;
  opening_hours: { weekday_text?: string[] } | null;
  photo_references: string[] | null;
  price_level: number | null;
  types: string[] | null;
};

export function usePlaceDetails(placeId: string | undefined | null) {
  return useQuery({
    queryKey: ['place-details', placeId],
    queryFn: async () => {
      const res = await fetch(`/api/places/details?place_id=${placeId}`);
      if (!res.ok) throw new Error('Failed to fetch place details');
      return res.json() as Promise<PlaceDetailsData>;
    },
    enabled: !!placeId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
