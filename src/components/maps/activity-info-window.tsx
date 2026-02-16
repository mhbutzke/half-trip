'use client';

import { InfoWindow } from '@react-google-maps/api';
import { getCategoryInfo } from '@/lib/utils/activity-categories';
import type { ActivityCategory } from '@/types/database';

interface ActivityInfoWindowProps {
  position: google.maps.LatLngLiteral;
  title: string;
  category: ActivityCategory;
  location: string | null;
  startTime: string | null;
  onClose: () => void;
  onViewDetails: () => void;
}

export function ActivityInfoWindow({
  position,
  title,
  category,
  location,
  startTime,
  onClose,
  onViewDetails,
}: ActivityInfoWindowProps) {
  const categoryInfo = getCategoryInfo(category);
  const Icon = categoryInfo.icon;

  return (
    <InfoWindow position={position} onCloseClick={onClose}>
      <div className="max-w-[220px] p-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center justify-center rounded-full p-1 ${categoryInfo.bgColor}`}
          >
            <Icon className={`h-3 w-3 ${categoryInfo.color}`} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>

        {startTime && <p className="text-xs text-gray-500">{startTime}</p>}

        {location && <p className="mt-0.5 truncate text-xs text-gray-500">{location}</p>}

        <button
          type="button"
          onClick={onViewDetails}
          className="mt-2 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ver detalhes
        </button>
      </div>
    </InfoWindow>
  );
}
