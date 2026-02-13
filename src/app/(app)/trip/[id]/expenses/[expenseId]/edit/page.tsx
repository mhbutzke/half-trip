import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getExpenseById } from '@/lib/supabase/expenses';
import { getTripById, getTripMembers } from '@/lib/supabase/trips';
import { PageContainer } from '@/components/layout/page-container';
import { ExpenseForm } from '@/components/expenses/expense-form';

interface EditExpensePageProps {
  params: Promise<{ id: string; expenseId: string }>;
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id: tripId, expenseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [trip, expense, members] = await Promise.all([
    getTripById(tripId),
    getExpenseById(expenseId),
    getTripMembers(tripId),
  ]);

  if (!trip || !expense) {
    notFound();
  }

  return (
    <PageContainer>
      <ExpenseForm
        tripId={tripId}
        members={members}
        currentUserId={user.id}
        baseCurrency={trip.base_currency}
        expense={expense}
      />
    </PageContainer>
  );
}
