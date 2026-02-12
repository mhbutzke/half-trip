'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CalendarSync, Link2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { TripWithMembers } from '@/lib/supabase/trips';

interface ItineraryHeaderProps {
  trip: TripWithMembers;
  userRole: 'organizer' | 'participant' | null;
  googleCalendarConnected: boolean;
}

export function ItineraryHeader({ trip, googleCalendarConnected }: ItineraryHeaderProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const startDate = new Date(trip.start_date + 'T00:00:00');
  const endDate = new Date(trip.end_date + 'T00:00:00');
  const totalDays = differenceInDays(endDate, startDate) + 1;

  const handleGoogleCalendar = async () => {
    if (!googleCalendarConnected) {
      window.location.assign(
        `/api/google-calendar/connect?redirect=${encodeURIComponent(`/trip/${trip.id}/itinerary`)}`
      );
      return;
    }

    setIsSyncing(true);

    try {
      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId: trip.id }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        reconnectRequired?: boolean;
        created?: number;
        updated?: number;
        failed?: number;
      } | null;

      if (!response.ok) {
        if (payload?.reconnectRequired) {
          toast.error(payload.error || 'Reconecte sua conta Google para sincronizar.');
          router.push('/settings');
          return;
        }
        toast.error(payload?.error || 'Erro ao sincronizar Google Agenda');
        return;
      }

      toast.success('Sincronização concluída', {
        description: `${payload?.created || 0} criadas, ${payload?.updated || 0} atualizadas${payload?.failed ? `, ${payload.failed} falhas` : ''}.`,
      });
    } catch {
      toast.error('Erro ao sincronizar Google Agenda');
    } finally {
      setIsSyncing(false);
    }
  };

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

        <Button
          type="button"
          variant={googleCalendarConnected ? 'outline' : 'default'}
          onClick={handleGoogleCalendar}
          loading={isSyncing}
        >
          {googleCalendarConnected ? (
            <>
              <CalendarSync className="h-4 w-4" />
              Sincronizar Google Agenda
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Conectar Google Agenda
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
