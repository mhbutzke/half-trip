import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getUserProfile } from '@/lib/supabase/profile';
import { getDashboardData } from '@/lib/supabase/dashboard';
import { TripContent } from './trip-content';

interface TripPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params;

  // Fetch data from server (will be used when online)
  const [trip, userRole, currentUser, dashboard] = await Promise.all([
    getTripById(id),
    getUserRoleInTrip(id),
    getUserProfile(),
    getDashboardData(id),
  ]);

  return (
    <TripContent
      tripId={id}
      initialTrip={trip}
      initialUserRole={userRole}
      initialCurrentUser={currentUser}
      initialDashboard={dashboard}
    />
  );
}
