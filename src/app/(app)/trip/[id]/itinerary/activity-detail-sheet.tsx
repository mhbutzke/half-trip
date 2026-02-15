'use client';

import { useMemo } from 'react';
import {
  Clock,
  MapPin,
  Navigation,
  Pencil,
  Share2,
  Trash2,
  CalendarSync,
  ExternalLink,
  Paperclip,
} from 'lucide-react';
import { PlaceDetailsCard } from '@/components/activities/place-details-card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCategoryInfo, formatDuration, formatTime } from '@/lib/utils/activity-categories';
import { transportTypeMap } from '@/lib/utils/transport-types';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { PendingIndicator } from '@/components/sync';
import { toast } from 'sonner';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { ActivityLink, ActivityMetadata } from '@/types/database';

interface ActivityDetailSheetProps {
  activity: ActivityWithCreator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (activity: ActivityWithCreator) => void;
  onDelete: (activity: ActivityWithCreator) => void;
  onSync: (activity: ActivityWithCreator) => void;
  isSyncing?: boolean;
}

export function ActivityDetailSheet({
  activity,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onSync,
  isSyncing = false,
}: ActivityDetailSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)');

  if (!activity) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={
          isDesktop ? 'sm:max-w-md overflow-y-auto' : 'max-h-[85vh] overflow-y-auto rounded-t-2xl'
        }
      >
        <ActivityDetailContent
          activity={activity}
          onEdit={onEdit}
          onDelete={onDelete}
          onSync={onSync}
          isSyncing={isSyncing}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function ActivityDetailContent({
  activity,
  onEdit,
  onDelete,
  onSync,
  isSyncing,
  onClose,
}: {
  activity: ActivityWithCreator;
  onEdit: (activity: ActivityWithCreator) => void;
  onDelete: (activity: ActivityWithCreator) => void;
  onSync: (activity: ActivityWithCreator) => void;
  isSyncing: boolean;
  onClose: () => void;
}) {
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
    : activity.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`
      : null;
  const { isPending } = useSyncStatus('activities', activity.id);
  const attachmentsCount = activity.attachments_count ?? 0;

  return (
    <>
      {/* Mobile drag handle indicator */}
      <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/20 sm:hidden" />

      <SheetHeader className="px-0">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${categoryInfo.bgColor}`}
          >
            <CategoryIcon className={`h-6 w-6 ${categoryInfo.color}`} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg leading-tight">{activity.title}</SheetTitle>
            <SheetDescription className="mt-0.5">
              {categoryInfo.label}
              {isPending && (
                <span className="ml-2">
                  <PendingIndicator isPending={isPending} size="sm" showLabel />
                </span>
              )}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-4 pt-2">
        {/* Time & Duration */}
        {(activity.start_time || activity.duration_minutes) && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {activity.start_time && (
              <div className="flex items-center gap-1.5 text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{formatTime(activity.start_time)}</span>
              </div>
            )}
            {activity.duration_minutes && (
              <Badge variant="secondary">{formatDuration(activity.duration_minutes)}</Badge>
            )}
            {attachmentsCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-xs">
                  {attachmentsCount} anexo{attachmentsCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        {activity.location && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
              {locationMapsUrl ? (
                <a
                  href={locationMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:underline"
                >
                  {activity.location}
                </a>
              ) : (
                <span>{activity.location}</span>
              )}
            </div>
            {locationMapsUrl && (
              <a
                href={locationMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                Abrir no Maps
              </a>
            )}
            {meta?.location_place_id && (
              <PlaceDetailsCard placeId={meta.location_place_id} compact={false} />
            )}
          </div>
        )}

        {/* Flight Details */}
        {activity.category === 'transport' &&
          (() => {
            const flightMeta = activity.metadata as {
              carrier?: string;
              flight_number?: string;
              status?: string;
              departure?: { iata?: string; terminal?: string };
              arrival?: { iata?: string; terminal?: string };
            } | null;
            return flightMeta?.carrier ? (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <div className="font-medium">
                  {flightMeta.carrier} {flightMeta.flight_number}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({flightMeta.status})
                  </span>
                </div>
                <div className="mt-1.5 flex gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold">Dep:</span> {flightMeta.departure?.iata}
                    {flightMeta.departure?.terminal && ` (T${flightMeta.departure.terminal})`}
                  </div>
                  <div>
                    <span className="font-semibold">Arr:</span> {flightMeta.arrival?.iata}
                    {flightMeta.arrival?.terminal && ` (T${flightMeta.arrival.terminal})`}
                  </div>
                </div>
              </div>
            ) : null;
          })()}

        {/* Description */}
        {activity.description && (
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Descrição
            </span>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {activity.description}
            </p>
          </div>
        )}

        {/* Links */}
        {links.length > 0 && (
          <div className="space-y-2">
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
                  className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                const url = `${window.location.origin}/trip/${activity.trip_id}/itinerary`;
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: activity.title,
                      text: `${activity.title}${activity.location ? ` em ${activity.location}` : ''}`,
                      url,
                    });
                    return;
                  } catch {}
                }
                await navigator.clipboard.writeText(url);
                toast.success('Link copiado!');
              }}
            >
              <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Compartilhar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onSync(activity)}
              disabled={isSyncing}
            >
              <CalendarSync className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {isSyncing ? 'Sincronizando...' : 'Agenda'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onClose();
                onEdit(activity);
              }}
            >
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => {
                onClose();
                onDelete(activity);
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
