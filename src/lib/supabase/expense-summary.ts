import { createClient } from './server';
import { calculateBalancesWithSettlements } from '@/lib/balance/calculate-balance';
import { calculateSettlements } from '@/lib/balance/calculate-settlements';
import type { ExpenseData, ParticipantData, PersistedSettlement } from '@/lib/balance/types';
import { getTripExpenses } from './expenses';
import { getTripById } from './trips';
import { getTripParticipants } from './participants';
import { getSettledSettlements } from './settlements';

/**
 * Gets comprehensive expense summary for a trip with balance calculations and settlements.
 * Uses trip_participants (supports both registered users and guests).
 */
export async function getTripExpenseSummary(tripId: string) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return null;
  }

  // Get all required data in parallel
  const [trip, expenses, participantsResult, settledSettlements] = await Promise.all([
    getTripById(tripId),
    getTripExpenses(tripId),
    getTripParticipants(tripId),
    getSettledSettlements(tripId),
  ]);

  const baseCurrency = trip?.base_currency || 'BRL';
  const participants = participantsResult.data ?? [];

  // Transform expenses for balance calculation
  const expenseData: ExpenseData[] = expenses.map((expense) => ({
    id: expense.id,
    amount: expense.amount,
    paidByParticipantId: expense.paid_by_participant_id,
    exchangeRate: expense.exchange_rate ?? 1,
    splits: expense.expense_splits.map((split) => ({
      participantId: split.participant_id,
      amount: split.amount,
    })),
  }));

  // Transform participants for balance calculation
  const participantData: ParticipantData[] = participants.map((p) => ({
    participantId: p.id,
    participantName: p.displayName,
    participantAvatar: p.displayAvatar,
    participantType: p.type,
  }));

  // Transform persisted settlements
  const persistedSettlements: PersistedSettlement[] = settledSettlements.map((settlement) => ({
    fromParticipantId: settlement.from_participant_id,
    toParticipantId: settlement.to_participant_id,
    amount: settlement.amount,
  }));

  // Calculate balances accounting for settled settlements
  const balanceResult = calculateBalancesWithSettlements(
    expenseData,
    participantData,
    persistedSettlements
  );

  // Calculate suggested settlements from current balances
  const suggestedSettlements = calculateSettlements(balanceResult.participants);

  return {
    tripId,
    baseCurrency,
    totalExpenses: balanceResult.totalExpenses,
    expenseCount: expenses.length,
    participants: balanceResult.participants,
    suggestedSettlements,
    settledSettlements,
  };
}
