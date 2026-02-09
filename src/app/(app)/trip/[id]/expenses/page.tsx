import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTripById, getTripMembers, getUserRoleInTrip } from '@/lib/supabase/trips';
import { getTripExpenses } from '@/lib/supabase/expenses';
import { PageContainer } from '@/components/layout/page-container';
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

  const [trip, expenses, members, userRole] = await Promise.all([
    getTripById(tripId),
    getTripExpenses(tripId),
    getTripMembers(tripId),
    getUserRoleInTrip(tripId),
  ]);

  if (!trip) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ExpensesHeader tripId={tripId} tripName={trip.name} />
      <ExpensesList
        tripId={tripId}
        initialExpenses={expenses}
        members={members}
        userRole={userRole}
        currentUserId={user.id}
      />
    </div>
  );
}

export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const { id } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<ExpensesSkeleton />}>
        <ExpensesContent tripId={id} />
      </Suspense>
    </PageContainer>
  );
}
