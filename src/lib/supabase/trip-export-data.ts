'use server';

import { createClient } from './server';
import { getTripExpenses } from './expenses';
import { getTripParticipants } from './participants';
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
    .select('name, destination, start_date, end_date, base_currency')
    .eq('id', tripId)
    .single();

  if (!trip) return null;

  const [expenses, participantsResult, summary] = await Promise.all([
    getTripExpenses(tripId),
    getTripParticipants(tripId),
    getTripExpenseSummary(tripId),
  ]);

  const participants = participantsResult.data ?? [];

  // Build participant name map (participant_id -> displayName)
  const participantNameMap = new Map<string, string>();
  participants.forEach((p) => {
    participantNameMap.set(p.id, p.displayName);
  });

  const expenseRows: ExpenseExportRow[] = expenses.map((e) => ({
    date: e.date,
    description: e.description,
    category: e.category,
    amount: e.amount,
    currency: e.currency,
    exchange_rate: e.exchange_rate ?? 1,
    paid_by_name:
      (e.paid_by_participant_id && participantNameMap.get(e.paid_by_participant_id)) ||
      e.paid_by_user?.name ||
      'Convidado',
    notes: e.notes,
  }));

  const baseCurrency = trip.base_currency || 'BRL';
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount * (e.exchange_rate ?? 1), 0);

  const participantSummary = summary
    ? summary.participants.map((p) => ({
        name: p.participantName,
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
    baseCurrency,
    expenses: expenseRows,
    totalAmount,
    currency: baseCurrency,
    participants: participantSummary,
  };
}
