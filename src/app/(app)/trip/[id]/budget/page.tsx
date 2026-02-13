import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripBudgets, getBudgetSummary } from '@/lib/supabase/budgets';
import { PageContainer } from '@/components/layout/page-container';
import { FinancesTabBar } from '@/components/layout/finances-tab-bar';
import { Button } from '@/components/ui/button';
import { BudgetContent } from './budget-content';
import BudgetLoading from './loading';
import { routes } from '@/lib/routes';

interface BudgetPageProps {
  params: Promise<{ id: string }>;
}

async function BudgetPageContent({ tripId }: { tripId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(routes.login());
  }

  const [trip, budgets, summary, userRole] = await Promise.all([
    getTripById(tripId),
    getTripBudgets(tripId),
    getBudgetSummary(tripId),
    getUserRoleInTrip(tripId),
  ]);

  if (!trip) {
    notFound();
  }

  const defaultSummary = summary || {
    totalBudget: null,
    totalSpent: 0,
    categoryBudgets: [],
    currency: 'BRL',
  };

  return (
    <div className="space-y-6">
      <FinancesTabBar tripId={tripId} />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
            <Link href={routes.trip.overview(tripId)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{trip.name}</span>
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamento</h1>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Defina limites e acompanhe os gastos</span>
          </div>
        </div>
      </div>

      <BudgetContent
        tripId={tripId}
        initialSummary={defaultSummary}
        allBudgets={budgets}
        isOrganizer={userRole === 'organizer'}
      />
    </div>
  );
}

export default async function BudgetPage({ params }: BudgetPageProps) {
  const { id } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<BudgetLoading />}>
        <BudgetPageContent tripId={id} />
      </Suspense>
    </PageContainer>
  );
}
