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
import type { ActivityCategory, ActivityMetadata } from '@/types/database';
import { transportTypeMap } from '@/lib/utils/transport-types';

export const activityCategoryConfig: Record<
  ActivityCategory,
  { label: string; icon: LucideIcon; color: string }
> = {
  transport: {
    label: 'Transporte',
    icon: Plane,
    color: 'text-activity-transport bg-activity-transport/15',
  },
  accommodation: {
    label: 'Hospedagem',
    icon: Hotel,
    color: 'text-activity-accommodation bg-activity-accommodation/15',
  },
  tour: {
    label: 'Passeio',
    icon: MapPin,
    color: 'text-activity-tour bg-activity-tour/15',
  },
  meal: {
    label: 'Refeicao',
    icon: Utensils,
    color: 'text-activity-meal bg-activity-meal/15',
  },
  event: {
    label: 'Evento',
    icon: Calendar,
    color: 'text-activity-event bg-activity-event/15',
  },
  other: {
    label: 'Outro',
    icon: MoreHorizontal,
    color: 'text-activity-other bg-activity-other/15',
  },
};

/** Resolve which icon to render for a given category + metadata */
function renderCategoryIcon(
  category: ActivityCategory,
  metadata: ActivityMetadata | null | undefined,
  className: string
) {
  if (category === 'transport' && metadata?.transport_type) {
    const transportInfo = transportTypeMap[metadata.transport_type];
    if (transportInfo) {
      const TransportIcon = transportInfo.icon;
      return <TransportIcon className={className} aria-hidden="true" />;
    }
  }
  const DefaultIcon = activityCategoryConfig[category].icon;
  return <DefaultIcon className={className} aria-hidden="true" />;
}

interface ActivityCategoryIconProps {
  category: ActivityCategory;
  metadata?: ActivityMetadata | null;
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
  metadata,
  size = 'md',
  showLabel = false,
}: ActivityCategoryIconProps) {
  const config = activityCategoryConfig[category];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center rounded-lg ${sizeClasses[size]} ${config.color}`}
      >
        {renderCategoryIcon(category, metadata, iconSizeClasses[size])}
      </div>
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </div>
  );
}

interface ActivityCategoryBadgeProps {
  category: ActivityCategory;
  metadata?: ActivityMetadata | null;
}

export function ActivityCategoryBadge({ category, metadata }: ActivityCategoryBadgeProps) {
  const config = activityCategoryConfig[category];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      {renderCategoryIcon(category, metadata, 'h-3 w-3')}
      {config.label}
    </div>
  );
}
