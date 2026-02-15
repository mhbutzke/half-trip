import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Scale } from 'lucide-react';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripExpenseSummary } from '@/lib/supabase/expense-summary';
import { getUser } from '@/lib/supabase/auth';
import { PageContainer } from '@/components/layout/page-container';
import { FinancesTabBar } from '@/components/layout/finances-tab-bar';
import { BalanceContent } from './balance-content';
import { BalanceSkeleton } from './balance-skeleton';

type BalancePageProps = {
  params: Promise<{ id: string }>;
};

export default async function BalancePage({ params }: BalancePageProps) {
  const { id } = await params;

  return (
    <PageContainer className="pt-2 md:pt-6">
      <Suspense fallback={<BalanceSkeleton />}>
        <BalancePageContent tripId={id} />
      </Suspense>
    </PageContainer>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Balanço</h1>
        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
          <Scale className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">Veja quem deve para quem e acerte as contas</span>
        </div>
      </div>
      <FinancesTabBar tripId={tripId} />
      <BalanceContent
        summary={summary}
        trip={trip}
        currentUserId={user.id}
        isOrganizer={userRole === 'organizer'}
      />
    </div>
  );
}
