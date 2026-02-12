'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  DollarSign,
  FileText,
  Users,
  Wallet,
  CheckSquare,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InviteDialog } from '@/components/invites/invite-dialog';
import { useTripRealtime } from '@/hooks/use-trip-realtime';
import type { TripWithMembers } from '@/lib/supabase/trips';

// Lazy load dialogs - only needed when user clicks a CTA button
const AddActivityDialog = dynamic(
  () =>
    import('@/components/activities/add-activity-dialog').then((mod) => ({
      default: mod.AddActivityDialog,
    })),
  { ssr: false }
);
const AddNoteDialog = dynamic(
  () =>
    import('@/components/notes/add-note-dialog').then((mod) => ({
      default: mod.AddNoteDialog,
    })),
  { ssr: false }
);
const BudgetFormDialog = dynamic(
  () =>
    import('@/components/budget/budget-form-dialog').then((mod) => ({
      default: mod.BudgetFormDialog,
    })),
  { ssr: false }
);
const ChecklistFormDialog = dynamic(
  () =>
    import('@/components/checklists/checklist-form-dialog').then((mod) => ({
      default: mod.ChecklistFormDialog,
    })),
  { ssr: false }
);

interface TripOverviewProps {
  trip: TripWithMembers;
  userRole: 'organizer' | 'participant' | null;
  currentUserId?: string;
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
    id: 'budget',
    title: 'Orçamento',
    description: 'Defina limites e acompanhe os gastos',
    icon: Wallet,
    href: (tripId: string) => `/trip/${tripId}/budget`,
    placeholder: 'Nenhum orçamento definido ainda',
    cta: 'Definir orçamento',
  },
  {
    id: 'checklists',
    title: 'Checklists',
    description: 'Listas de itens e tarefas da viagem',
    icon: CheckSquare,
    href: (tripId: string) => `/trip/${tripId}/checklists`,
    placeholder: 'Nenhuma checklist criada ainda',
    cta: 'Criar checklist',
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

export function TripOverview({ trip, userRole, currentUserId }: TripOverviewProps) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  // Enable real-time updates for this trip
  useTripRealtime({ tripId: trip.id });

  const handleCtaClick = (sectionId: string, href: string, e: React.MouseEvent) => {
    e.preventDefault();
    switch (sectionId) {
      case 'participants':
        setIsInviteOpen(true);
        break;
      case 'itinerary':
        setIsActivityOpen(true);
        break;
      case 'budget':
        setIsBudgetOpen(true);
        break;
      case 'checklists':
        setIsChecklistOpen(true);
        break;
      case 'notes':
        setIsNoteOpen(true);
        break;
      case 'expenses':
        // Expenses use a dedicated page (full form with splits)
        router.push(`/trip/${trip.id}/expenses/add`);
        break;
    }
  };

  return (
    <>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative z-10"
                      onClick={(e) => handleCtaClick(section.id, href, e)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {section.cta}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{section.placeholder}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative z-10"
                      onClick={(e) => handleCtaClick(section.id, href, e)}
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

      {/* Invite Dialog */}
      <InviteDialog
        tripId={trip.id}
        tripName={trip.name}
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        userRole={userRole}
        currentUserId={currentUserId}
      />

      {/* Add Activity Dialog */}
      <AddActivityDialog
        tripId={trip.id}
        defaultDate={trip.start_date}
        open={isActivityOpen}
        onOpenChange={setIsActivityOpen}
        onSuccess={() => {
          setIsActivityOpen(false);
          router.refresh();
        }}
      />

      {/* Budget Form Dialog */}
      <BudgetFormDialog
        tripId={trip.id}
        open={isBudgetOpen}
        onOpenChange={setIsBudgetOpen}
        existingCategories={[]}
        onSuccess={() => {
          setIsBudgetOpen(false);
          router.refresh();
        }}
      />

      {/* Checklist Form Dialog */}
      <ChecklistFormDialog
        tripId={trip.id}
        open={isChecklistOpen}
        onOpenChange={setIsChecklistOpen}
        onSuccess={() => {
          setIsChecklistOpen(false);
          router.refresh();
        }}
      />

      {/* Add Note Dialog */}
      <AddNoteDialog
        tripId={trip.id}
        open={isNoteOpen}
        onOpenChange={setIsNoteOpen}
        onNoteCreated={() => {
          setIsNoteOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
