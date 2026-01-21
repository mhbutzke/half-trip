'use server';

import { createClient } from './server';
import { getTripExpenses } from './expenses';
import { getTripMembers } from './trips';
import { getSettledSettlements } from './settlements';
import {
  calculateBalancesWithSettlements,
  calculateSettlements,
  type ExpenseData,
  type TripMemberData,
  type ParticipantBalance,
  type Settlement,
  type PersistedSettlement,
} from '@/lib/balance';
import type { SettlementWithUsers } from './settlements';

export type TripExpenseSummary = {
  tripId: string;
  totalExpenses: number;
  expenseCount: number;
  participants: ParticipantBalance[];
  suggestedSettlements: Settlement[];
  settledSettlements: SettlementWithUsers[];
};

export async function getTripExpenseSummary(tripId: string): Promise<TripExpenseSummary | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return null;
  }

  const [expenses, members, settledSettlements] = await Promise.all([
    getTripExpenses(tripId),
    getTripMembers(tripId),
    getSettledSettlements(tripId),
  ]);

  const expenseData: ExpenseData[] = expenses.map((expense) => ({
    id: expense.id,
    amount: expense.amount,
    paidById: expense.paid_by,
    splits: expense.expense_splits.map((split) => ({
      userId: split.user_id,
      amount: split.amount,
    })),
  }));

  const memberData: TripMemberData[] = members.map((member) => ({
    userId: member.user_id,
    userName: member.users.name,
    userAvatar: member.users.avatar_url,
  }));

  const persistedSettlements: PersistedSettlement[] = settledSettlements.map((settlement) => ({
    fromUserId: settlement.from_user,
    toUserId: settlement.to_user,
    amount: settlement.amount,
  }));

  const balanceResult = calculateBalancesWithSettlements(
    expenseData,
    memberData,
    persistedSettlements
  );

  const suggestedSettlements = calculateSettlements(balanceResult.participants);

  return {
    tripId,
    totalExpenses: balanceResult.totalExpenses,
    expenseCount: expenses.length,
    participants: balanceResult.participants,
    suggestedSettlements,
    settledSettlements,
  };
}
