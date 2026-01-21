'use client';

import Link from 'next/link';
import { Calendar, DollarSign, FileText, Users, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TripWithMembers } from '@/lib/supabase/trips';

interface TripOverviewProps {
  trip: TripWithMembers;
  userRole: 'organizer' | 'participant' | null;
}

const sections = [
  {
    id: 'itinerary',
    title: 'Itinerário',
    description: 'Organize o roteiro dia a dia da viagem',
    icon: Calendar,
    href: (tripId: string) => `/trip/${tripId}/itinerary`,
    placeholder: 'Nenhuma atividade planejada ainda',
    cta: 'Adicionar atividade',
  },
  {
    id: 'expenses',
    title: 'Despesas',
    description: 'Registre e divida os gastos da viagem',
    icon: DollarSign,
    href: (tripId: string) => `/trip/${tripId}/expenses`,
    placeholder: 'Nenhuma despesa registrada ainda',
    cta: 'Adicionar despesa',
  },
  {
    id: 'participants',
    title: 'Participantes',
    description: 'Gerencie quem faz parte da viagem',
    icon: Users,
    href: (tripId: string) => `/trip/${tripId}/participants`,
    placeholder: null,
    cta: 'Convidar participante',
  },
  {
    id: 'notes',
    title: 'Notas',
    description: 'Informações importantes sobre a viagem',
    icon: FileText,
    href: (tripId: string) => `/trip/${tripId}/notes`,
    placeholder: 'Nenhuma nota adicionada ainda',
    cta: 'Adicionar nota',
  },
];

export function TripOverview({ trip, userRole }: TripOverviewProps) {
  const isOrganizer = userRole === 'organizer';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sections.map((section) => {
        const Icon = section.icon;
        const href = section.href(trip.id);

        return (
          <Card key={section.id} className="group relative overflow-hidden">
            <Link href={href} className="absolute inset-0 z-0" />

            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </CardHeader>

            <CardContent>
              {section.id === 'participants' ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {trip.memberCount} {trip.memberCount === 1 ? 'participante' : 'participantes'}
                  </p>
                  {isOrganizer && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative z-10"
                      onClick={(e) => {
                        e.preventDefault();
                        // TODO: Open invite dialog
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {section.cta}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{section.placeholder}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Open add dialog
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {section.cta}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
