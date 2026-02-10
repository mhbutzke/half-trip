'use server';

import { createClient } from './server';
import { getTripExpenses } from './expenses';
import { getTripMembers } from './trips';
import { getTripExpenseSummary } from './expense-summary';
import type { ExpenseExportRow } from '@/lib/export/csv-expenses';
import type { PdfReportData } from '@/lib/export/pdf-expense-report';

export async function getTripExportData(tripId: string): Promise<PdfReportData | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: trip } = await supabase
    .from('trips')
    .select('name, destination, start_date, end_date')
    .eq('id', tripId)
    .single();

  if (!trip) return null;

  const [expenses, members, summary] = await Promise.all([
    getTripExpenses(tripId),
    getTripMembers(tripId),
    getTripExpenseSummary(tripId),
  ]);

  // Build member name map
  const memberNameMap = new Map<string, string>();
  members.forEach((m) => {
    memberNameMap.set(m.user_id, m.users.name);
  });

  const expenseRows: ExpenseExportRow[] = expenses.map((e) => ({
    date: e.date,
    description: e.description,
    category: e.category,
    amount: e.amount,
    currency: e.currency,
    paid_by_name: memberNameMap.get(e.paid_by) || 'N/A',
    notes: e.notes,
  }));

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const participants = summary
    ? summary.participants.map((p) => ({
        name: p.userName,
        paid: p.totalPaid,
        owes: p.totalOwed,
        balance: p.netBalance,
      }))
    : [];

  return {
    tripName: trip.name,
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    expenses: expenseRows,
    totalAmount,
    currency: 'BRL',
    participants,
  };
}
