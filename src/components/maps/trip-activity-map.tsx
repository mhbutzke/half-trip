'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleMap, MarkerF, MarkerClustererF, PolylineF } from '@react-google-maps/api';
import { format, parseISO } from 'date-fns';
import { useGoogleMaps } from './google-maps-provider';
import { ActivityInfoWindow } from './activity-info-window';
import { MapMissingLocationsBanner } from './map-missing-locations-banner';
import {
  extractActivitiesWithCoords,
  getMapBounds,
  getMarkerColor,
  getDayColor,
  groupActivitiesWithCoordsByDate,
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
    date: string;
    sort_order: number;
    metadata: unknown;
    [key: string]: unknown;
  }[];
  tripDays?: string[];
  onActivitySelect?: (activity: {
    id: string;
    title: string;
    category: ActivityCategory;
    location: string | null;
    start_time: string | null;
    date: string;
    sort_order: number;
    metadata: unknown;
    [key: string]: unknown;
  }) => void;
  className?: string;
}

export function TripActivityMap({
  activities,
  tripDays,
  onActivitySelect,
  className,
}: TripActivityMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | 'all'>('all');

  const activitiesWithCoords = extractActivitiesWithCoords(activities);

  // Agrupar atividades por dia
  const activitiesByDay = useMemo(
    () => groupActivitiesWithCoordsByDate(activitiesWithCoords),
    [activitiesWithCoords]
  );

  // Dias disponíveis no mapa (com pelo menos 1 atividade com coords)
  const availableDays = useMemo(() => {
    return Array.from(activitiesByDay.keys()).sort();
  }, [activitiesByDay]);

  // Atividades filtradas por dia selecionado
  const filteredActivities = useMemo(() => {
    if (selectedDay === 'all') return activitiesWithCoords;
    return activitiesByDay.get(selectedDay) || [];
  }, [selectedDay, activitiesWithCoords, activitiesByDay]);

  // Dias visíveis para polylines
  const visibleDays = useMemo(() => {
    if (selectedDay === 'all') return availableDays;
    return availableDays.filter((d) => d === selectedDay);
  }, [selectedDay, availableDays]);

  const selectedActivity = filteredActivities.find((a) => a.id === selectedId);

  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Fit bounds when filtered activities change
  useEffect(() => {
    if (!mapRef.current || filteredActivities.length === 0) return;

    const bounds = getMapBounds(filteredActivities);
    if (!bounds) return;

    if (filteredActivities.length === 1) {
      mapRef.current.setCenter({
        lat: filteredActivities[0].coords.lat,
        lng: filteredActivities[0].coords.lng,
      });
      mapRef.current.setZoom(15);
    } else {
      const gBounds = new google.maps.LatLngBounds(
        { lat: bounds.south, lng: bounds.west },
        { lat: bounds.north, lng: bounds.east }
      );
      mapRef.current.fitBounds(gBounds, 50);
    }
  }, [filteredActivities]);

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
      {availableDays.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtro por dia">
          <button
            type="button"
            role="tab"
            aria-selected={selectedDay === 'all'}
            className={cn(
              'inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
              selectedDay === 'all'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            )}
            onClick={() => setSelectedDay('all')}
          >
            Todos
          </button>
          {availableDays.map((date, index) => {
            const dayNumber = tripDays ? tripDays.indexOf(date) + 1 : index + 1;
            const color = getDayColor(index);
            return (
              <button
                key={date}
                type="button"
                role="tab"
                aria-selected={selectedDay === date}
                className={cn(
                  'inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                  selectedDay === date
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setSelectedDay(date)}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                {dayNumber > 0 ? `Dia ${dayNumber}` : format(parseISO(date), 'dd/MM')}
              </button>
            );
          })}
        </div>
      )}

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
        <MarkerClustererF
          options={{
            maxZoom: 14,
            minimumClusterSize: 5,
          }}
        >
          {(clusterer) => (
            <>
              {filteredActivities.map((activity) => (
                <MarkerF
                  key={activity.id}
                  position={activity.coords}
                  clusterer={clusterer}
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
            </>
          )}
        </MarkerClustererF>

        {visibleDays.map((date) => {
          const dayActivities = activitiesByDay.get(date);
          if (!dayActivities || dayActivities.length < 2) return null;
          const dayIndex = availableDays.indexOf(date);
          const color = getDayColor(dayIndex);
          const path = dayActivities.map((a) => ({ lat: a.coords.lat, lng: a.coords.lng }));
          return (
            <PolylineF
              key={`route-${date}`}
              path={path}
              options={{
                strokeColor: color,
                strokeOpacity: 0.8,
                strokeWeight: 3,
                geodesic: true,
                icons: [
                  {
                    icon: {
                      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: 2.5,
                      fillColor: color,
                      fillOpacity: 0.7,
                      strokeWeight: 0,
                    },
                    repeat: '80px',
                  },
                ],
              }}
            />
          );
        })}

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
