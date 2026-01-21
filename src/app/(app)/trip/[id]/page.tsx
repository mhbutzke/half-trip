import { notFound } from 'next/navigation';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
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
  const [trip, userRole] = await Promise.all([getTripById(id), getUserRoleInTrip(id)]);

  if (!trip) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <TripHeader trip={trip} userRole={userRole} />
        <TripOverview trip={trip} userRole={userRole} />
      </div>
    </PageContainer>
  );
}
