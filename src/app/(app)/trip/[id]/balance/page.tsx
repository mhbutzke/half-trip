import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripExpenseSummary } from '@/lib/supabase/expense-summary';
import { getUser } from '@/lib/supabase/auth';
import { BalanceHeader } from './balance-header';
import { BalanceContent } from './balance-content';
import { BalanceSkeleton } from './balance-skeleton';

type BalancePageProps = {
  params: Promise<{ id: string }>;
};

export default async function BalancePage({ params }: BalancePageProps) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<BalanceSkeleton />}>
        <BalancePageContent tripId={id} />
      </Suspense>
    </div>
  );
}

async function BalancePageContent({ tripId }: { tripId: string }) {
  const user = await getUser();

  if (!user) {
    notFound();
  }

  const [trip, summary, userRole] = await Promise.all([
    getTripById(tripId),
    getTripExpenseSummary(tripId),
    getUserRoleInTrip(tripId),
  ]);

  if (!trip || !summary || !userRole) {
    notFound();
  }

  return (
    <>
      <BalanceHeader trip={trip} />
      <BalanceContent
        summary={summary}
        trip={trip}
        currentUserId={user.id}
        isOrganizer={userRole === 'organizer'}
      />
    </>
  );
}
