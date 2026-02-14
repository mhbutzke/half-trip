'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InviteDialog } from '@/components/invites/invite-dialog';

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

        <Button onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar
        </Button>
      </div>

      <InviteDialog
        tripId={tripId}
        tripName={tripName}
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        userRole={userRole}
        currentUserId={currentUserId}
      />
    </>
  );
}
