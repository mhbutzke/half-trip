'use client';

/* eslint-disable @next/next/no-img-element */
import { usePlaceDetails } from '@/hooks/use-place-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Phone, Globe, Clock } from 'lucide-react';

interface PlaceDetailsCardProps {
  placeId: string;
  compact?: boolean;
}

export function PlaceDetailsCard({ placeId, compact = true }: PlaceDetailsCardProps) {
  const { data, isLoading, isError } = usePlaceDetails(placeId);

  if (!placeId || isError) return null;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
        <Skeleton className="h-32 w-full rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (!data) return null;

  const firstPhoto =
    data.photo_references && data.photo_references.length > 0 ? data.photo_references[0] : null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
      {firstPhoto && (
        <img
          src={`/api/places/photo?reference=${encodeURIComponent(firstPhoto)}&maxwidth=400`}
          alt={data.name ?? 'Foto do local'}
          className="h-32 w-full object-cover rounded-md"
          loading="lazy"
        />
      )}

      {data.rating != null && (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
          <span className="font-medium">{data.rating}</span>
          {data.user_ratings_total != null && (
            <span className="text-muted-foreground">({data.user_ratings_total})</span>
          )}
        </div>
      )}

      {data.website && (
        <div className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <a
            href={data.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate"
          >
            Visitar site
          </a>
        </div>
      )}

      {!compact && (
        <>
          {data.formatted_address && (
            <p className="text-muted-foreground">{data.formatted_address}</p>
          )}

          {data.formatted_phone_number && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <a
                href={`tel:${data.formatted_phone_number}`}
                className="text-primary hover:underline"
              >
                {data.formatted_phone_number}
              </a>
            </div>
          )}

          {data.opening_hours?.weekday_text && data.opening_hours.weekday_text.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-1.5 cursor-pointer list-none">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground hover:text-foreground">
                  Horário de funcionamento
                </span>
              </summary>
              <ul className="mt-1 ml-5.5 space-y-0.5 text-muted-foreground">
                {data.opening_hours.weekday_text.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </details>
          )}

          {!compact && data.photo_references && data.photo_references.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {data.photo_references.slice(1).map((ref, i) => (
                <img
                  key={i}
                  src={`/api/places/photo?reference=${encodeURIComponent(ref)}&maxwidth=400`}
                  alt={`${data.name ?? 'Local'} - foto ${i + 2}`}
                  className="h-24 w-32 object-cover rounded-md flex-shrink-0"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
