'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import {
  Clock,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  CalendarSync,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCategoryInfo, formatDuration, formatTime } from '@/lib/utils/activity-categories';
import { transportTypeMap } from '@/lib/utils/transport-types';
import { getAttachmentsCount } from '@/lib/supabase/attachments';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { ActivityLink, ActivityMetadata } from '@/types/database';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { PendingIndicator } from '@/components/sync';

interface ActivityCardProps {
  activity: ActivityWithCreator;
  onEdit: (activity: ActivityWithCreator) => void;
  onDelete: (activity: ActivityWithCreator) => void;
  onSync: (activity: ActivityWithCreator) => void;
  isSyncing?: boolean;
}

export const ActivityCard = memo(function ActivityCard({
  activity,
  onEdit,
  onDelete,
  onSync,
  isSyncing = false,
}: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [attachmentsCount, setAttachmentsCount] = useState(0);
  const meta = activity.metadata as ActivityMetadata | null;
  const categoryInfo = getCategoryInfo(activity.category);
  const CategoryIcon = useMemo(() => {
    if (activity.category === 'transport' && meta?.transport_type) {
      const transportInfo = transportTypeMap[meta.transport_type];
      if (transportInfo) return transportInfo.icon;
    }
    return categoryInfo.icon;
  }, [activity.category, meta?.transport_type, categoryInfo.icon]);
  const links = Array.isArray(activity.links) ? (activity.links as ActivityLink[]) : [];
  const locationMapsUrl = meta?.location_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${meta.location_lat},${meta.location_lng}&query_place_id=${meta.location_place_id}`
    : null;
  const { isPending } = useSyncStatus('activities', activity.id);

  const hasDetails = activity.description || links.length > 0;

  // Fetch attachments count
  useEffect(() => {
    getAttachmentsCount(activity.id).then(setAttachmentsCount);
  }, [activity.id]);

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${categoryInfo.bgColor}`}
          >
            <CategoryIcon className={`h-5 w-5 ${categoryInfo.color}`} aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium leading-tight">{activity.title}</h3>

                {/* Time, Duration, Attachments, and Sync Status */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {activity.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatTime(activity.start_time)}
                    </span>
                  )}
                  {activity.duration_minutes && (
                    <Badge variant="secondary" className="text-xs">
                      {formatDuration(activity.duration_minutes)}
                    </Badge>
                  )}
                  {attachmentsCount > 0 && (
                    <span
                      className="flex items-center gap-1"
                      title={`${attachmentsCount} anexo(s)`}
                      aria-label={`${attachmentsCount} anexo${attachmentsCount > 1 ? 's' : ''}`}
                    >
                      <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                      {attachmentsCount}
                    </span>
                  )}
                  {isPending && <PendingIndicator isPending={isPending} size="sm" showLabel />}
                </div>

                {/* Location */}
                {activity.location && (
                  <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    {locationMapsUrl ? (
                      <a
                        href={locationMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:text-foreground hover:underline"
                        aria-label={`${activity.location} - ver no Google Maps (abre em nova aba)`}
                      >
                        {activity.location}
                      </a>
                    ) : (
                      <span className="truncate">{activity.location}</span>
                    )}
                  </div>
                )}

                {/* Flight Details */}
                {activity.category === 'transport' &&
                  (() => {
                    const meta = activity.metadata as {
                      carrier?: string;
                      flight_number?: string;
                      status?: string;
                      departure?: { iata?: string; terminal?: string };
                      arrival?: { iata?: string; terminal?: string };
                    } | null;
                    return meta?.carrier ? (
                      <div className="mt-2 text-sm bg-muted/50 p-2 rounded border">
                        <div className="font-medium">
                          {meta.carrier} {meta.flight_number}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({meta.status})
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <div>
                            <span className="font-semibold">Dep:</span> {meta.departure?.iata}
                            {meta.departure?.terminal && ` (T${meta.departure.terminal})`}
                          </div>
                          <div>
                            <span className="font-semibold">Arr:</span> {meta.arrival?.iata}
                            {meta.arrival?.terminal && ` (T${meta.arrival.terminal})`}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
              </div>

              {/* Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
                    aria-label="Opções da atividade"
                  >
                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSync(activity)} disabled={isSyncing}>
                    <CalendarSync className="mr-2 h-4 w-4" aria-hidden="true" />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar na agenda'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(activity)}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(activity)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Expandable Content */}
            {hasDetails && (
              <>
                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    {/* Description */}
                    {activity.description && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                    )}

                    {/* Links */}
                    {links.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Links
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {links.map((link, index) => (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-sm transition-colors hover:bg-muted"
                              aria-label={`${link.label} (abre em nova aba)`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setIsExpanded(!isExpanded)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Ver detalhes
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
