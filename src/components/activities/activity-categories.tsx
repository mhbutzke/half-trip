'use client';

import {
  Plane,
  Hotel,
  MapPin,
  Utensils,
  Calendar,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityCategory } from '@/types/database';

export const activityCategoryConfig: Record<
  ActivityCategory,
  { label: string; icon: LucideIcon; color: string }
> = {
  transport: {
    label: 'Transporte',
    icon: Plane,
    color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  },
  accommodation: {
    label: 'Hospedagem',
    icon: Hotel,
    color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  },
  tour: {
    label: 'Passeio',
    icon: MapPin,
    color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  },
  meal: {
    label: 'Refeicao',
    icon: Utensils,
    color: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  },
  event: {
    label: 'Evento',
    icon: Calendar,
    color: 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  },
  other: {
    label: 'Outro',
    icon: MoreHorizontal,
    color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800/50',
  },
};

interface ActivityCategoryIconProps {
  category: ActivityCategory;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function ActivityCategoryIcon({
  category,
  size = 'md',
  showLabel = false,
}: ActivityCategoryIconProps) {
  const config = activityCategoryConfig[category];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center rounded-lg ${sizeClasses[size]} ${config.color}`}
      >
        <Icon className={iconSizeClasses[size]} />
      </div>
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </div>
  );
}

interface ActivityCategoryBadgeProps {
  category: ActivityCategory;
}

export function ActivityCategoryBadge({ category }: ActivityCategoryBadgeProps) {
  const config = activityCategoryConfig[category];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  );
}
