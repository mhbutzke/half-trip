'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays, isFuture, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
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
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EditTripDialog } from '@/components/trips/edit-trip-dialog';
import { DeleteTripDialog } from '@/components/trips/delete-trip-dialog';
import { archiveTrip, unarchiveTrip, type TripWithMembers } from '@/lib/supabase/trips';
import type { TripStyle } from '@/types/database';
import Link from 'next/link';

interface TripHeaderProps {
  trip: TripWithMembers;
  userRole: 'organizer' | 'participant' | null;
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

export function TripHeader({ trip, userRole }: TripHeaderProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const StyleIcon = trip.style ? styleIcons[trip.style] : MapPin;
  const status = getTripStatus(trip.start_date, trip.end_date);
  const isArchived = !!trip.archived_at;
  const isOrganizer = userRole === 'organizer';

  const formatDate = (date: string) => {
    return format(new Date(date), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const tripDuration = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1;

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await archiveTrip(trip.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Viagem arquivada');
        router.refresh();
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    setIsArchiving(true);
    try {
      const result = await unarchiveTrip(trip.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Viagem desarquivada');
        router.refresh();
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    router.refresh();
  };

  const handleDeleteSuccess = () => {
    setIsDeleteOpen(false);
    router.push('/trips');
  };

  // Get up to 5 member avatars
  const displayMembers = trip.trip_members?.slice(0, 5) || [];
  const remainingMembers = Math.max(0, trip.memberCount - 5);

  return (
    <>
      <div className="space-y-4">
        {/* Back link and actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/trips"
            className="flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar para viagens</span>
            <span className="sm:hidden">Voltar</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Compartilhar viagem">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Em breve: Convidar participantes</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {isOrganizer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Opções da viagem">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  {isArchived ? (
                    <DropdownMenuItem onClick={handleUnarchive} disabled={isArchiving}>
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      Desarquivar
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleArchive} disabled={isArchiving}>
                      <Archive className="mr-2 h-4 w-4" />
                      Arquivar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Trip info */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {isArchived && <Badge variant="outline">Arquivada</Badge>}
            {trip.style && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <StyleIcon className="h-3 w-3" />
                {styleLabels[trip.style]}
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{trip.name}</h1>

          {trip.description && (
            <p className="text-muted-foreground max-w-2xl">{trip.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{trip.destination}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                <span className="text-xs ml-1">
                  ({tripDuration} {tripDuration === 1 ? 'dia' : 'dias'})
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <div className="flex items-center gap-2">
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
                <span className="text-sm">
                  {trip.memberCount} {trip.memberCount === 1 ? 'viajante' : 'viajantes'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditTripDialog
        trip={trip}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={handleEditSuccess}
      />

      <DeleteTripDialog
        tripId={trip.id}
        tripName={trip.name}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
