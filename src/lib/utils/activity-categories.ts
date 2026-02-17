import type { ActivityCategory, ActivityMetadata } from '@/types/database';
import {
  Plane,
  Home,
  MapPin,
  Utensils,
  Calendar,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { getTransportIcon } from './transport-types';

export type ActivityCategoryInfo = {
  value: ActivityCategory;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
};

export const activityCategoryMap: Record<ActivityCategory, ActivityCategoryInfo> = {
  transport: {
    value: 'transport',
    label: 'Transporte',
    icon: Plane,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-l-blue-500 dark:border-l-blue-400',
    dotColor: 'bg-blue-500 dark:bg-blue-400',
  },
  accommodation: {
    value: 'accommodation',
    label: 'Hospedagem',
    icon: Home,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-l-purple-500 dark:border-l-purple-400',
    dotColor: 'bg-purple-500 dark:bg-purple-400',
  },
  tour: {
    value: 'tour',
    label: 'Passeio',
    icon: MapPin,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderColor: 'border-l-emerald-500 dark:border-l-emerald-400',
    dotColor: 'bg-emerald-500 dark:bg-emerald-400',
  },
  meal: {
    value: 'meal',
    label: 'Refeição',
    icon: Utensils,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-l-orange-500 dark:border-l-orange-400',
    dotColor: 'bg-orange-500 dark:bg-orange-400',
  },
  event: {
    value: 'event',
    label: 'Evento',
    icon: Calendar,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    borderColor: 'border-l-pink-500 dark:border-l-pink-400',
    dotColor: 'bg-pink-500 dark:bg-pink-400',
  },
  other: {
    value: 'other',
    label: 'Outro',
    icon: MoreHorizontal,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    borderColor: 'border-l-gray-400 dark:border-l-gray-500',
    dotColor: 'bg-gray-400 dark:bg-gray-500',
  },
};

export const activityCategoryList: ActivityCategoryInfo[] = Object.values(activityCategoryMap);

export function getCategoryInfo(category: ActivityCategory): ActivityCategoryInfo {
  return activityCategoryMap[category] || activityCategoryMap.other;
}

export function getCategoryIcon(
  category: ActivityCategory,
  metadata?: ActivityMetadata | null
): LucideIcon {
  if (category === 'transport' && metadata?.transport_type) {
    return getTransportIcon(metadata.transport_type);
  }
  return getCategoryInfo(category).icon;
}

export function getCategoryLabel(category: ActivityCategory): string {
  return getCategoryInfo(category).label;
}

/**
 * Formats duration in minutes to a human-readable string
 */
export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes) return null;

  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Formats a time string for display
 * Handles both HH:MM:SS and HH:MM formats, returning clean HH:MM
 */
export function formatTime(time: string | null | undefined): string | null {
  if (!time) return null;
  // Strip seconds if present (HH:MM:SS -> HH:MM)
  return time.slice(0, 5);
}

/**
 * Converts minutes to HH:mm format
 */
export function minutesToHHmm(minutes: number | null | undefined): string {
  if (!minutes && minutes !== 0) return '';
  if (minutes === 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Converts HH:mm string to minutes
 */
export function hhmmToMinutes(hhmm: string): number | null {
  if (!hhmm || !hhmm.trim()) return null;
  const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || minutes < 0 || minutes > 59) return null;
  const total = hours * 60 + minutes;
  if (total <= 0 || total > 1440) return null;
  return total;
}
