import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getUserProfile } from '@/lib/supabase/profile';
import { getDashboardData } from '@/lib/supabase/dashboard';
import { getTripPolls } from '@/lib/supabase/polls';
import { getTripRecapData } from '@/lib/supabase/trip-recap-data';
import { getTripParticipants } from '@/lib/supabase/participants';
import { TripContent } from './trip-content';

interface TripPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params;

  // Fetch data from server (will be used when online)
  const [trip, userRole, currentUser, dashboard, polls, participantsResult] = await Promise.all([
    getTripById(id),
    getUserRoleInTrip(id),
    getUserProfile(),
    getDashboardData(id),
    getTripPolls(id),
    getTripParticipants(id),
  ]);

  // Only fetch recap data if trip has ended
  const tripEnded = trip ? new Date(trip.end_date) < new Date() : false;
  const recapData = tripEnded ? await getTripRecapData(id) : null;

  return (
    <TripContent
      tripId={id}
      initialTrip={trip}
      initialUserRole={userRole}
      initialCurrentUser={currentUser}
      initialDashboard={dashboard}
      initialPolls={polls}
      initialRecapData={recapData}
      initialParticipants={participantsResult.data ?? []}
    />
  );
}
