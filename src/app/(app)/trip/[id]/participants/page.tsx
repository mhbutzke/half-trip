import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTripById, getTripMembers, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripInvites, getEmailInvites } from '@/lib/supabase/invites';
import { getTripParticipants } from '@/lib/supabase/participants';
import { getTripGroups } from '@/lib/supabase/groups';
import { PageContainer } from '@/components/layout/page-container';
import { ParticipantsList } from './participants-list';
import { ParticipantsHeader } from './participants-header';
import { ParticipantsSkeleton } from './participants-skeleton';
import { routes } from '@/lib/routes';

interface ParticipantsPageProps {
  params: Promise<{ id: string }>;
}

async function ParticipantsContent({ tripId }: { tripId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(routes.login());
  }

  const [trip, members, userRole, linkInvites, emailInvites, participantsResult, groupsResult] =
    await Promise.all([
      getTripById(tripId),
      getTripMembers(tripId),
      getUserRoleInTrip(tripId),
      getTripInvites(tripId),
      getEmailInvites(tripId),
      getTripParticipants(tripId),
      getTripGroups(tripId),
    ]);

  if (!trip) {
    notFound();
  }

  // Combine and deduplicate invites (link invites without email)
  const pendingInvites = [...linkInvites.filter((inv) => !inv.email), ...emailInvites];

  // All participants (members + guests resolved)
  const allParticipants = participantsResult.data ?? [];

  // Filter only guests from participants
  const guests = allParticipants.filter((p) => p.type === 'guest');

  // Groups
  const groups = groupsResult.data ?? [];

  return (
    <div className="space-y-6">
      <ParticipantsHeader
        tripId={tripId}
        tripName={trip.name}
        userRole={userRole}
        currentUserId={user.id}
        allParticipants={allParticipants}
      />
      <ParticipantsList
        members={members}
        guests={guests}
        groups={groups}
        allParticipants={allParticipants}
        pendingInvites={pendingInvites}
        userRole={userRole}
        currentUserId={user.id}
        tripId={tripId}
      />
    </div>
  );
}

export default async function ParticipantsPage({ params }: ParticipantsPageProps) {
  const { id } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<ParticipantsSkeleton />}>
        <ParticipantsContent tripId={id} />
      </Suspense>
    </PageContainer>
  );
}
