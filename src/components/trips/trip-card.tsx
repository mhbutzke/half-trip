'use client';

import Link from 'next/link';
import { format, differenceInDays, isFuture, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MapPin,
  Calendar,
  Users,
  Mountain,
  Palmtree,
  Landmark,
  UtensilsCrossed,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TripWithMembers } from '@/lib/supabase/trips';
import type { TripStyle } from '@/types/database';

interface TripCardProps {
  trip: TripWithMembers;
  userRole?: 'organizer' | 'participant' | null;
  onEdit?: (trip: TripWithMembers) => void;
  onArchive?: (tripId: string) => void;
  onUnarchive?: (tripId: string) => void;
  onDelete?: (tripId: string) => void;
}

const styleIcons: Record<TripStyle, typeof Mountain> = {
  adventure: Mountain,
  relaxation: Palmtree,
  cultural: Landmark,
  gastronomic: UtensilsCrossed,
  other: MapPin,
};

const styleLabels: Record<TripStyle, string> = {
  adventure: 'Aventura',
  relaxation: 'Relaxamento',
  cultural: 'Cultural',
  gastronomic: 'Gastronômica',
  other: 'Outro',
};

function getTripStatus(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  if (isFuture(start)) {
    const daysUntil = differenceInDays(start, today);
    if (daysUntil === 0 || isToday(start)) {
      return { label: 'Começa hoje', variant: 'default' as const };
    }
    if (daysUntil === 1) {
      return { label: 'Começa amanhã', variant: 'default' as const };
    }
    if (daysUntil <= 7) {
      return { label: `Em ${daysUntil} dias`, variant: 'secondary' as const };
    }
    return { label: 'Planejada', variant: 'outline' as const };
  }

  if (isPast(end)) {
    return { label: 'Concluída', variant: 'secondary' as const };
  }

  return { label: 'Em andamento', variant: 'default' as const };
}

export function TripCard({
  trip,
  userRole,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: TripCardProps) {
  const StyleIcon = trip.style ? styleIcons[trip.style] : MapPin;
  const status = getTripStatus(trip.start_date, trip.end_date);
  const isArchived = !!trip.archived_at;
  const isOrganizer = userRole === 'organizer';

  const formatDate = (date: string) => {
    return format(new Date(date), "d 'de' MMM", { locale: ptBR });
  };

  const tripDuration = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1;

  // Get up to 4 member avatars
  const displayMembers = trip.trip_members?.slice(0, 4) || [];
  const remainingMembers = Math.max(0, trip.memberCount - 4);

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <Link href={`/trip/${trip.id}`} className="absolute inset-0 z-0" />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={status.variant} className="shrink-0">
                {status.label}
              </Badge>
              {isArchived && (
                <Badge variant="outline" className="shrink-0">
                  Arquivada
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg truncate">{trip.name}</h3>
          </div>

          {isOrganizer && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-10 h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Opções</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit?.(trip);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                {isArchived ? (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      onUnarchive?.(trip.id);
                    }}
                  >
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Desarquivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      onArchive?.(trip.id);
                    }}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete?.(trip.id);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="text-sm truncate">{trip.destination}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
            <span className="text-xs ml-1">
              ({tripDuration} {tripDuration === 1 ? 'dia' : 'dias'})
            </span>
          </span>
        </div>

        {trip.style && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <StyleIcon className="h-4 w-4 shrink-0" />
            <span className="text-sm">{styleLabels[trip.style]}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {displayMembers.map((member) => (
                <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={member.users?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.users?.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {remainingMembers > 0 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                  +{remainingMembers}
                </div>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {trip.memberCount} {trip.memberCount === 1 ? 'viajante' : 'viajantes'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
