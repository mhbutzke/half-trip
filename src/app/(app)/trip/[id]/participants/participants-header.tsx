'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InviteDialog } from '@/components/invites/invite-dialog';
import { AddGuestDialog } from './add-guest-dialog';

interface ParticipantsHeaderProps {
  tripId: string;
  tripName: string;
  userRole: 'organizer' | 'participant' | null;
  currentUserId?: string;
}

export function ParticipantsHeader({
  tripId,
  tripName,
  userRole,
  currentUserId,
}: ParticipantsHeaderProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const isOrganizer = userRole === 'organizer';

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href={`/trip/${tripId}`}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground active:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6 text-primary" />
            Participantes
          </h1>
          <p className="text-muted-foreground">{tripName}</p>
        </div>

        <div className="flex gap-2">
          {isOrganizer && (
            <Button variant="outline" onClick={() => setIsGuestOpen(true)}>
              <UserRound className="mr-2 h-4 w-4" />
              Convidado
            </Button>
          )}
          <Button onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Convidar
          </Button>
        </div>
      </div>

      <InviteDialog
        tripId={tripId}
        tripName={tripName}
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        userRole={userRole}
        currentUserId={currentUserId}
      />

      {isOrganizer && (
        <AddGuestDialog tripId={tripId} open={isGuestOpen} onOpenChange={setIsGuestOpen} />
      )}
    </>
  );
}
