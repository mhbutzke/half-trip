'use client';

import { useMemo } from 'react';
import {
  Clock,
  DollarSign,
  MapPin,
  Navigation,
  Pencil,
  Share2,
  ExternalLink,
  Paperclip,
  Globe,
} from 'lucide-react';
import { PlaceDetailsCard } from '@/components/activities/place-details-card';
import { ActivityQuickInfo } from '@/components/itinerary/activity-quick-info';
import { ActivityExpensesSection } from '@/components/itinerary/activity-expenses-section';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  onAddExpense?: (activity: ActivityWithCreator) => void;
}

export function ActivityDetailSheet({
  activity,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onSync,
  isSyncing = false,
  onAddExpense,
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
          onAddExpense={onAddExpense}
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
  onAddExpense,
}: {
  activity: ActivityWithCreator;
  onEdit: (activity: ActivityWithCreator) => void;
  onDelete: (activity: ActivityWithCreator) => void;
  onSync: (activity: ActivityWithCreator) => void;
  isSyncing: boolean;
  onClose: () => void;
  onAddExpense?: (activity: ActivityWithCreator) => void;
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

  // Get place details for rating if available
  const placeRating = typeof meta?.rating === 'number' ? meta.rating : undefined;
  const placeReviewCount =
    typeof meta?.user_ratings_total === 'number' ? meta.user_ratings_total : undefined;

  return (
    <>
      {/* Mobile drag handle indicator */}
      <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/20 sm:hidden" />

      <SheetHeader className="px-0">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${categoryInfo.bgColor}`}
          >
            <CategoryIcon className={`h-5 w-5 ${categoryInfo.color}`} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base leading-tight">{activity.title}</SheetTitle>
            <SheetDescription className="mt-0.5 text-xs">
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

      <div className="space-y-3 pt-2">
        {/* Quick Info Card */}
        <ActivityQuickInfo
          startTime={activity.start_time ? formatTime(activity.start_time) : undefined}
          duration={
            activity.duration_minutes ? formatDuration(activity.duration_minutes) : undefined
          }
          rating={placeRating}
          reviewCount={placeReviewCount}
        />

        {attachmentsCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {attachmentsCount} anexo{attachmentsCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Location with Maps button */}
        {activity.location && (
          <div className="space-y-2">
            <div className="flex items-start gap-1.5 text-sm">
              <MapPin
                className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5"
                aria-hidden="true"
              />
              <span className="text-muted-foreground flex-1">{activity.location}</span>
            </div>
            {locationMapsUrl && (
              <Button variant="outline" size="sm" className="w-full h-9" asChild>
                <a href={locationMapsUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation className="mr-2 h-4 w-4" aria-hidden="true" />
                  Abrir no Maps
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Place Details Card */}
        {meta?.location_place_id && (
          <PlaceDetailsCard placeId={meta.location_place_id} compact={false} />
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
              Links úteis
            </span>
            <div className="space-y-1.5">
              {links.map((link, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full h-9 justify-start"
                  asChild
                >
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Globe className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{link.label}</span>
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Linked Expenses */}
        <ActivityExpensesSection activityId={activity.id} />

        {/* Actions */}
        <Separator className="my-4" />
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
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
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => {
                onClose();
                onEdit(activity);
              }}
            >
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
          </div>
          {onAddExpense && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onClose();
                onAddExpense(activity);
              }}
            >
              <DollarSign className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Adicionar Despesa
            </Button>
          )}
          <Separator className="my-2" />
          <button
            type="button"
            className="mx-auto block text-xs text-destructive hover:text-destructive/80 hover:underline transition-colors py-2"
            onClick={() => {
              onClose();
              onDelete(activity);
            }}
          >
            Excluir atividade
          </button>
        </div>
      </div>
    </>
  );
}
