'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useGoogleMaps } from './google-maps-provider';
import { ActivityInfoWindow } from './activity-info-window';
import { MapMissingLocationsBanner } from './map-missing-locations-banner';
import {
  extractActivitiesWithCoords,
  getMapBounds,
  getMarkerColor,
  darkModeMapStyles,
} from '@/lib/utils/map-helpers';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityCategory } from '@/types/database';

interface TripActivityMapProps {
  activities: {
    id: string;
    title: string;
    category: ActivityCategory;
    location: string | null;
    start_time: string | null;
    metadata: unknown;
    [key: string]: unknown;
  }[];
  onActivitySelect?: (activity: {
    id: string;
    title: string;
    category: ActivityCategory;
    location: string | null;
    start_time: string | null;
    metadata: unknown;
    [key: string]: unknown;
  }) => void;
  className?: string;
}

export function TripActivityMap({ activities, onActivitySelect, className }: TripActivityMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const activitiesWithCoords = extractActivitiesWithCoords(activities);
  const selectedActivity = activitiesWithCoords.find((a) => a.id === selectedId);

  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Fit bounds when activities change
  useEffect(() => {
    if (!mapRef.current || activitiesWithCoords.length === 0) return;

    const bounds = getMapBounds(activitiesWithCoords);
    if (!bounds) return;

    if (activitiesWithCoords.length === 1) {
      mapRef.current.setCenter({
        lat: activitiesWithCoords[0].coords.lat,
        lng: activitiesWithCoords[0].coords.lng,
      });
      mapRef.current.setZoom(15);
    } else {
      const gBounds = new google.maps.LatLngBounds(
        { lat: bounds.south, lng: bounds.west },
        { lat: bounds.north, lng: bounds.east }
      );
      mapRef.current.fitBounds(gBounds, 50);
    }
  }, [activitiesWithCoords]);

  if (loadError) {
    return (
      <div
        className={cn('flex items-center justify-center rounded-lg border bg-muted/20', className)}
      >
        <p className="text-sm text-muted-foreground">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border bg-muted/20 animate-pulse',
          className
        )}
      >
        <p className="text-sm text-muted-foreground">Carregando mapa...</p>
      </div>
    );
  }

  if (activitiesWithCoords.length === 0) {
    return (
      <div className="space-y-3">
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/20',
            className
          )}
        >
          <MapPin className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade com localização no mapa.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Adicione locais às atividades para vê-las aqui.
          </p>
        </div>
        {activities.length > 0 && (
          <MapMissingLocationsBanner totalActivities={activities.length} activitiesWithCoords={0} />
        )}
      </div>
    );
  }

  const center = {
    lat: activitiesWithCoords[0].coords.lat,
    lng: activitiesWithCoords[0].coords.lng,
  };

  return (
    <div className="space-y-2">
      <GoogleMap
        mapContainerClassName={cn('rounded-lg border', className)}
        center={center}
        zoom={13}
        onLoad={onMapLoad}
        options={{
          gestureHandling: 'greedy',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: isDark ? darkModeMapStyles : undefined,
        }}
      >
        {activitiesWithCoords.map((activity) => (
          <MarkerF
            key={activity.id}
            position={activity.coords}
            onClick={() => setSelectedId(activity.id)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: getMarkerColor(activity.category),
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 10,
            }}
          />
        ))}

        {selectedActivity && (
          <ActivityInfoWindow
            position={selectedActivity.coords}
            title={selectedActivity.title}
            category={selectedActivity.category}
            location={selectedActivity.location}
            startTime={selectedActivity.start_time}
            onClose={() => setSelectedId(null)}
            onViewDetails={() => {
              setSelectedId(null);
              const original = activities.find((a) => a.id === selectedActivity.id);
              if (original) onActivitySelect?.(original);
            }}
          />
        )}
      </GoogleMap>

      {activities.length > activitiesWithCoords.length && (
        <MapMissingLocationsBanner
          totalActivities={activities.length}
          activitiesWithCoords={activitiesWithCoords.length}
        />
      )}
    </div>
  );
}
