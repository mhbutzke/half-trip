'use client';

import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import type { TripWithMembers } from '@/lib/supabase/trips';

interface ItineraryHeaderProps {
  trip: TripWithMembers;
  userRole: 'organizer' | 'participant' | null;
}

export function ItineraryHeader({ trip }: ItineraryHeaderProps) {
  const startDate = new Date(trip.start_date + 'T00:00:00');
  const endDate = new Date(trip.end_date + 'T00:00:00');
  const totalDays = differenceInDays(endDate, startDate) + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
          <Link href={`/trip/${trip.id}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{trip.name}</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roteiro</h1>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              {format(startDate, "d 'de' MMM", { locale: ptBR })} -{' '}
              {format(endDate, "d 'de' MMM, yyyy", { locale: ptBR })}
            </span>
            <span className="text-sm text-muted-foreground">
              ({totalDays} {totalDays === 1 ? 'dia' : 'dias'})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
