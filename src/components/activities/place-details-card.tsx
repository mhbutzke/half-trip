'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { usePlaceDetails } from '@/hooks/use-place-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Phone, Globe, Clock, ChevronDown, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PhotoGalleryDialog } from '@/components/itinerary/photo-gallery-dialog';
import { cn } from '@/lib/utils';

interface PlaceDetailsCardProps {
  placeId: string;
  compact?: boolean;
}

export function PlaceDetailsCard({ placeId, compact = true }: PlaceDetailsCardProps) {
  const { data, isLoading, isError } = usePlaceDetails(placeId);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  if (!placeId || isError) return null;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
        <Skeleton className="h-48 w-full rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (!data) return null;

  const firstPhoto =
    data.photo_references && data.photo_references.length > 0 ? data.photo_references[0] : null;

  const allPhotos =
    data.photo_references?.map(
      (ref) => `/api/places/photo?reference=${encodeURIComponent(ref)}&maxwidth=800`
    ) || [];

  const hasMultiplePhotos = allPhotos.length > 1;
  const hasContactInfo =
    data.formatted_address ||
    data.formatted_phone_number ||
    (data.opening_hours?.weekday_text && data.opening_hours.weekday_text.length > 0);

  return (
    <>
      <div className="rounded-lg border bg-muted/30 overflow-hidden text-sm space-y-3">
        {/* Photo with gallery badge */}
        {firstPhoto && (
          <div className="relative">
            <img
              src={`/api/places/photo?reference=${encodeURIComponent(firstPhoto)}&maxwidth=400`}
              alt={data.name ?? 'Foto do local'}
              className="max-h-48 w-full object-cover"
              loading="lazy"
            />
            {hasMultiplePhotos && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2 h-8 bg-black/60 hover:bg-black/80 text-white border-0"
                onClick={() => setIsGalleryOpen(true)}
              >
                <Images className="mr-1.5 h-3.5 w-3.5" />+{allPhotos.length - 1}{' '}
                {allPhotos.length - 1 === 1 ? 'foto' : 'fotos'}
              </Button>
            )}
          </div>
        )}

        <div className="px-3 pb-3 space-y-3">
          {/* Rating and website */}
          <div className="flex items-center justify-between gap-3">
            {data.rating != null && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="font-semibold">{data.rating.toFixed(1)}</span>
                {data.user_ratings_total != null && (
                  <span className="text-muted-foreground">({data.user_ratings_total})</span>
                )}
              </div>
            )}

            {data.website && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-primary" asChild>
                <a href={data.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Visitar site
                </a>
              </Button>
            )}
          </div>

          {/* Collapsible contact info */}
          {!compact && hasContactInfo && (
            <Collapsible open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                    Informações
                  </span>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', isInfoOpen && 'rotate-180')}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {data.formatted_address && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.formatted_address}
                  </p>
                )}

                {data.formatted_phone_number && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <a
                      href={`tel:${data.formatted_phone_number}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {data.formatted_phone_number}
                    </a>
                  </div>
                )}

                {data.opening_hours?.weekday_text && data.opening_hours.weekday_text.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="font-medium">Horário de funcionamento</span>
                    </div>
                    <ul className="ml-5 space-y-0.5 text-xs text-muted-foreground">
                      {data.opening_hours.weekday_text.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Photo Gallery Dialog */}
      {hasMultiplePhotos && (
        <PhotoGalleryDialog
          photos={allPhotos}
          placeName={data.name ?? 'Local'}
          open={isGalleryOpen}
          onOpenChange={setIsGalleryOpen}
        />
      )}
    </>
  );
}
