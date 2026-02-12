import { createClient } from './server';
import { calculateBalancesWithSettlements } from '@/lib/balance/calculate-balance';
import { calculateSettlements } from '@/lib/balance/calculate-settlements';
import type { ExpenseData, TripMemberData, PersistedSettlement } from '@/lib/balance/types';
import { getTripExpenses } from './expenses';
import { getTripById, getTripMembers } from './trips';
import { getSettledSettlements } from './settlements';

/**
 * Gets comprehensive expense summary for a trip with balance calculations and settlements
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
  const [trip, expenses, members, settledSettlements] = await Promise.all([
    getTripById(tripId),
    getTripExpenses(tripId),
    getTripMembers(tripId),
    getSettledSettlements(tripId),
  ]);

  const baseCurrency = trip?.base_currency || 'BRL';

  // Transform expenses for balance calculation
  const expenseData: ExpenseData[] = expenses.map((expense) => ({
    id: expense.id,
    amount: expense.amount,
    paidById: expense.paid_by,
    exchangeRate: expense.exchange_rate ?? 1,
    splits: expense.expense_splits.map((split) => ({
      userId: split.user_id,
      amount: split.amount,
    })),
  }));

  // Transform members for balance calculation
  const memberData: TripMemberData[] = members.map((member) => ({
    userId: member.user_id,
    userName: member.users.name,
    userAvatar: member.users.avatar_url,
  }));

  // Transform persisted settlements
  const persistedSettlements: PersistedSettlement[] = settledSettlements.map((settlement) => ({
    fromUserId: settlement.from_user,
    toUserId: settlement.to_user,
    amount: settlement.amount,
  }));

  // Calculate balances accounting for settled settlements
  const balanceResult = calculateBalancesWithSettlements(
    expenseData,
    memberData,
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
