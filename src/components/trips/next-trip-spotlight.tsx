'use client';

import { Link } from 'next-view-transitions';
import Image from 'next/image';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { routes } from '@/lib/routes';
import { parseDateOnly } from '@/lib/utils/date-only';
import type { ClientTripWithMembers } from '@/lib/supabase/trips-client';

interface NextTripSpotlightProps {
  trip: ClientTripWithMembers;
}

export function NextTripSpotlight({ trip }: NextTripSpotlightProps) {
  const startDate = parseDateOnly(trip.start_date);
  const endDate = parseDateOnly(trip.end_date);
  const daysUntil = differenceInDays(startDate, new Date());
  const isImminent = daysUntil <= 7 && daysUntil >= 0;

  const formattedStartDate = format(startDate, "d 'de' MMMM", { locale: ptBR });
  const formattedEndDate = format(endDate, "d 'de' MMMM, yyyy", { locale: ptBR });

  // Get up to 4 member avatars
  const displayMembers = trip.trip_members?.slice(0, 4) || [];
  const remainingMembers = Math.max(0, trip.memberCount - 4);

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {trip.cover_url && (
        <div className="absolute inset-0 opacity-10">
          <Image src={trip.cover_url} alt="" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <CardContent className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-primary">Sua próxima aventura</p>
            <h3 className="text-2xl font-bold tracking-tight line-clamp-2">{trip.name}</h3>
          </div>
          {isImminent && (
            <Badge
              variant="default"
              className="shrink-0 bg-primary/10 text-primary border-primary/20"
            >
              Em breve!
            </Badge>
          )}
        </div>

        {/* Countdown */}
        {daysUntil >= 0 && (
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tabular-nums text-primary">{daysUntil}</span>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{daysUntil === 1 ? 'dia' : 'dias'}</span>
              <br />
              restantes
            </div>
          </div>
        )}

        {/* Trip Info */}
        <div className="grid gap-2 text-sm">
          {trip.destination && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{trip.destination}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {formattedStartDate} - {formattedEndDate}
            </span>
          </div>
          {trip.memberCount > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex -space-x-2">
                {displayMembers.map((member) => (
                  <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={member.users.avatar_url || undefined} alt="" />
                    <AvatarFallback className="text-[10px]">
                      {member.users.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {remainingMembers > 0 && (
                <span className="text-xs text-muted-foreground">+{remainingMembers}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm" className="flex-1 sm:flex-none">
            <Link href={routes.trip.overview(trip.id)}>
              Ver detalhes
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Link href={routes.trip.expenses(trip.id)}>Adicionar gasto</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
