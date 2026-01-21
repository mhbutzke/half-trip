import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripActivities } from '@/lib/supabase/activities';
import { getUser } from '@/lib/supabase/auth';
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
  const [trip, activities, userRole, user] = await Promise.all([
    getTripById(tripId),
    getTripActivities(tripId),
    getUserRoleInTrip(tripId),
    getUser(),
  ]);

  if (!trip) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ItineraryHeader trip={trip} userRole={userRole} />
      <ItineraryList
        tripId={trip.id}
        startDate={trip.start_date}
        endDate={trip.end_date}
        initialActivities={activities}
        userRole={userRole}
        currentUserId={user?.id}
      />
    </div>
  );
}

export default async function ItineraryPage({ params }: ItineraryPageProps) {
  const { id } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<ItinerarySkeleton />}>
        <ItineraryContent tripId={id} />
      </Suspense>
    </PageContainer>
  );
}
