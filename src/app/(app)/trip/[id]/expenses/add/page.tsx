import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTripById, getTripMembers } from '@/lib/supabase/trips';
import { PageContainer } from '@/components/layout/page-container';
import { ExpenseForm } from '@/components/expenses/expense-form';

interface AddExpensePageProps {
  params: Promise<{ id: string }>;
}

export default async function AddExpensePage({ params }: AddExpensePageProps) {
  const { id: tripId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [trip, members] = await Promise.all([getTripById(tripId), getTripMembers(tripId)]);

  if (!trip) {
    notFound();
  }

  return (
    <PageContainer>
      <ExpenseForm
        tripId={tripId}
        members={members}
        currentUserId={user.id}
        baseCurrency={trip.base_currency}
      />
    </PageContainer>
  );
}
