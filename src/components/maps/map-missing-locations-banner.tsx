'use client';

import { MapPin } from 'lucide-react';

interface MapMissingLocationsBannerProps {
  totalActivities: number;
  activitiesWithCoords: number;
}

export function MapMissingLocationsBanner({
  totalActivities,
  activitiesWithCoords,
}: MapMissingLocationsBannerProps) {
  const missing = totalActivities - activitiesWithCoords;

  if (missing <= 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span>
        {missing} de {totalActivities}{' '}
        {totalActivities === 1 ? 'atividade não possui' : 'atividades não possuem'} coordenadas e{' '}
        {missing === 1 ? 'não aparece' : 'não aparecem'} no mapa.
      </span>
    </div>
  );
}
