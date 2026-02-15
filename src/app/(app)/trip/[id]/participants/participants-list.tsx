'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Mail, UserRound, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ParticipantCard } from './participant-card';
import { GuestCard } from './guest-card';
import { LeaveDialog } from './leave-dialog';
import { useTripRealtime } from '@/hooks/use-trip-realtime';
import type { TripMemberWithUser } from '@/lib/supabase/trips';
import type { TripParticipantResolved } from '@/lib/supabase/participants';
import type { TripInviteWithInviter } from '@/lib/supabase/invites';

interface ParticipantsListProps {
  members: TripMemberWithUser[];
  guests: TripParticipantResolved[];
  pendingInvites: TripInviteWithInviter[];
  userRole: 'organizer' | 'participant' | null;
  currentUserId: string;
  tripId: string;
}

export function ParticipantsList({
  members,
  guests,
  pendingInvites,
  userRole,
  currentUserId,
  tripId,
}: ParticipantsListProps) {
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // Enable real-time updates for this trip
  useTripRealtime({ tripId });

  const isOrganizer = userRole === 'organizer';

  // Separate organizers and participants
  const organizers = members.filter((m) => m.role === 'organizer');
  const participants = members.filter((m) => m.role === 'participant');

  return (
    <div className="space-y-6">
      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros ({members.length})
          </CardTitle>
          <CardDescription>Pessoas que fazem parte desta viagem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Organizers section */}
          {organizers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Organizadores ({organizers.length})
              </h4>
              <div className="space-y-2">
                {organizers.map((member) => (
                  <ParticipantCard
                    key={member.id}
                    member={member}
                    userRole={userRole}
                    currentUserId={currentUserId}
                    tripId={tripId}
                    onLeaveClick={() => setLeaveDialogOpen(true)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Separator between roles */}
          {organizers.length > 0 && participants.length > 0 && <Separator />}

          {/* Participants section */}
          {participants.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Participantes ({participants.length})
              </h4>
              <div className="space-y-2">
                {participants.map((member) => (
                  <ParticipantCard
                    key={member.id}
                    member={member}
                    userRole={userRole}
                    currentUserId={currentUserId}
                    tripId={tripId}
                    onLeaveClick={() => setLeaveDialogOpen(true)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guests */}
      {guests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" />
              Convidados ({guests.length})
            </CardTitle>
            <CardDescription>
              Pessoas sem conta no Half Trip que participam das despesas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {guests.map((guest) => (
                <GuestCard key={guest.id} guest={guest} tripId={tripId} canManage={isOrganizer} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Convites pendentes ({pendingInvites.length})
            </CardTitle>
            <CardDescription>Convites que ainda não foram aceitos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email || `Convite por link`}</p>
                      <p className="text-sm text-muted-foreground">
                        Expira{' '}
                        {formatDistanceToNow(new Date(invite.expires_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    por {invite.users?.name || 'Desconhecido'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Dialog */}
      <LeaveDialog tripId={tripId} open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} />
    </div>
  );
}
