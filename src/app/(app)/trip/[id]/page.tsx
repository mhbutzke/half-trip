import { notFound } from 'next/navigation';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getUser } from '@/lib/supabase/auth';
import { PageContainer } from '@/components/layout/page-container';
import { TripHeader } from './trip-header';
import { TripOverview } from './trip-overview';

interface TripPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params;
  const [trip, userRole, user] = await Promise.all([
    getTripById(id),
    getUserRoleInTrip(id),
    getUser(),
  ]);

  if (!trip) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <TripHeader trip={trip} userRole={userRole} currentUserId={user?.id} />
        <TripOverview trip={trip} userRole={userRole} currentUserId={user?.id} />
      </div>
    </PageContainer>
  );
}
