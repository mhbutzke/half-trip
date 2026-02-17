import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripActivities } from '@/lib/supabase/activities';
import { getUser } from '@/lib/supabase/auth';
import { getGoogleCalendarConnectionStatus } from '@/lib/supabase/google-calendar';
import { getTripParticipants } from '@/lib/supabase/participants';
import { PageContainer } from '@/components/layout/page-container';
import { ItineraryHeader } from './itinerary-header';
import { ItineraryList } from './itinerary-list';
import { ItinerarySkeleton } from './itinerary-skeleton';

interface ItineraryPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function ItineraryContent({ tripId }: { tripId: string }) {
  const [trip, activities, userRole, user, googleCalendar, participantsResult] = await Promise.all([
    getTripById(tripId),
    getTripActivities(tripId),
    getUserRoleInTrip(tripId),
    getUser(),
    getGoogleCalendarConnectionStatus(),
    getTripParticipants(tripId),
  ]);
  const participants = participantsResult.data || [];

  if (!trip) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ItineraryHeader
        trip={trip}
        userRole={userRole}
        googleCalendarConnected={googleCalendar.connected}
      />
      <ItineraryList
        tripId={trip.id}
        startDate={trip.start_date}
        endDate={trip.end_date}
        initialActivities={activities}
        userRole={userRole}
        googleCalendarConnected={googleCalendar.connected}
        currentUserId={user?.id}
        transportType={trip.transport_type}
        participants={participants}
        currentParticipantId={participants.find((p) => p.userId === user?.id)?.id}
        baseCurrency={trip.base_currency}
      />
    </div>
  );
}

export default async function ItineraryPage({ params }: ItineraryPageProps) {
  const { id } = await params;

  return (
    <PageContainer bottomNav>
      <Suspense fallback={<ItinerarySkeleton />}>
        <ItineraryContent tripId={id} />
      </Suspense>
    </PageContainer>
  );
}
