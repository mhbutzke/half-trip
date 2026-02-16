import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTripById, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripExpenses } from '@/lib/supabase/expenses';
import { getTripParticipants } from '@/lib/supabase/participants';
import { PageContainer } from '@/components/layout/page-container';
import { FinancesTabBar } from '@/components/layout/finances-tab-bar';
import { ExpensesList } from './expenses-list';
import { ExpensesHeader } from './expenses-header';
import { ExpensesSkeleton } from './expenses-skeleton';

interface ExpensesPageProps {
  params: Promise<{ id: string }>;
}

async function ExpensesContent({ tripId }: { tripId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [trip, expenses, participantsResult, userRole] = await Promise.all([
    getTripById(tripId),
    getTripExpenses(tripId),
    getTripParticipants(tripId),
    getUserRoleInTrip(tripId),
  ]);

  if (!trip) {
    notFound();
  }

  const participants = participantsResult.data ?? [];
  const currentParticipantId = participants.find((p) => p.userId === user.id)?.id ?? '';

  return (
    <div className="space-y-6">
      <ExpensesHeader tripId={tripId} tripName={trip.name} />
      <FinancesTabBar tripId={tripId} expensesCount={expenses.length} />
      <ExpensesList
        tripId={tripId}
        baseCurrency={trip.base_currency}
        initialExpenses={expenses}
        participants={participants}
        userRole={userRole}
        currentUserId={user.id}
        currentParticipantId={currentParticipantId}
      />
    </div>
  );
}

export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const { id } = await params;

  return (
    <PageContainer className="pt-2 md:pt-6">
      <Suspense fallback={<ExpensesSkeleton />}>
        <ExpensesContent tripId={id} />
      </Suspense>
    </PageContainer>
  );
}
