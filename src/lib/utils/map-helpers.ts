import type { ActivityCategory, ActivityMetadata } from '@/types/database';

export type ActivityWithCoords = {
  id: string;
  title: string;
  category: ActivityCategory;
  location: string | null;
  start_time: string | null;
  metadata: ActivityMetadata;
  coords: { lat: number; lng: number; place_id: string };
};

export function extractActivitiesWithCoords<
  T extends {
    id: string;
    title: string;
    category: ActivityCategory;
    location: string | null;
    start_time: string | null;
    metadata: unknown;
  },
>(activities: T[]): (T & { coords: { lat: number; lng: number; place_id: string } })[] {
  return activities
    .filter((a) => {
      const meta = a.metadata as ActivityMetadata | null;
      return meta?.location_lat != null && meta?.location_lng != null;
    })
    .map((a) => {
      const meta = a.metadata as ActivityMetadata;
      return {
        ...a,
        coords: {
          lat: meta.location_lat!,
          lng: meta.location_lng!,
          place_id: meta.location_place_id || '',
        },
      };
    });
}

export function getMapBounds(
  activities: { coords: { lat: number; lng: number } }[]
): google.maps.LatLngBoundsLiteral | null {
  if (activities.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const a of activities) {
    minLat = Math.min(minLat, a.coords.lat);
    maxLat = Math.max(maxLat, a.coords.lat);
    minLng = Math.min(minLng, a.coords.lng);
    maxLng = Math.max(maxLng, a.coords.lng);
  }

  return {
    south: minLat,
    north: maxLat,
    west: minLng,
    east: maxLng,
  };
}

const DAY_COLORS = [
  '#0d9488', // teal-600
  '#4f46e5', // indigo-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#059669', // emerald-600
  '#7c3aed', // violet-600
  '#ea580c', // orange-600
  '#0284c7', // sky-600
];

export function getDayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

export function groupActivitiesWithCoordsByDate<
  T extends {
    coords: { lat: number; lng: number };
    date: string;
    sort_order: number;
    start_time: string | null;
  },
>(activities: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const activity of activities) {
    const existing = grouped.get(activity.date);
    if (existing) {
      existing.push(activity);
    } else {
      grouped.set(activity.date, [activity]);
    }
  }

  for (const [, dayActivities] of grouped) {
    dayActivities.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
      if (a.start_time) return -1;
      if (b.start_time) return 1;
      return 0;
    });
  }

  return grouped;
}

const MARKER_COLORS: Record<ActivityCategory, string> = {
  transport: '#2563eb',
  accommodation: '#9333ea',
  tour: '#059669',
  meal: '#ea580c',
  event: '#ec4899',
  other: '#6b7280',
};

export function getMarkerColor(category: ActivityCategory): string {
  return MARKER_COLORS[category] || MARKER_COLORS.other;
}

export const darkModeMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];
