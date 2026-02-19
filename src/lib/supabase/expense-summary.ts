import {
  calculateBalancesWithSettlements,
  calculateGroupBalances,
} from '@/lib/balance/calculate-balance';
import {
  calculateSettlements,
  calculateEntitySettlements,
} from '@/lib/balance/calculate-settlements';
import type {
  ExpenseData,
  GroupData,
  ParticipantData,
  PersistedSettlement,
} from '@/lib/balance/types';
import { getTripExpenses } from './expenses';
import { getTripById } from './trips';
import { getTripParticipants } from './participants';
import { getTripGroups } from './groups';
import { getSettledSettlements } from './settlements';
import { requireTripMember } from './auth-helpers';

/**
 * Gets comprehensive expense summary for a trip with balance calculations and settlements.
 * Uses trip_participants (supports both registered users and guests).
 */
export async function getTripExpenseSummary(tripId: string) {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) return null;

  // Get all required data in parallel
  const [trip, expenses, participantsResult, settledSettlements, groupsResult] = await Promise.all([
    getTripById(tripId),
    getTripExpenses(tripId),
    getTripParticipants(tripId),
    getSettledSettlements(tripId),
    getTripGroups(tripId),
  ]);

  const baseCurrency = trip?.base_currency || 'BRL';
  const participants = participantsResult.data ?? [];
  const groups = groupsResult.data ?? [];
  const hasGroups = groups.length > 0;

  // Transform expenses for balance calculation
  const expenseData: ExpenseData[] = expenses.map((expense) => ({
    id: expense.id,
    amount: expense.amount,
    paidByParticipantId: expense.paid_by_participant_id || '',
    exchangeRate: expense.exchange_rate ?? 1,
    splits: expense.expense_splits.map((split) => ({
      participantId: split.participant_id || '',
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
    fromParticipantId: settlement.from_participant_id || '',
    toParticipantId: settlement.to_participant_id || '',
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

  if (hasGroups) {
    // Entity mode: aggregate balances into groups + solos
    const groupData: GroupData[] = groups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      memberParticipantIds: g.memberParticipantIds,
    }));

    const entities = calculateGroupBalances(balanceResult.participants, groupData, participantData);

    const entitySettlements = calculateEntitySettlements(entities);

    return {
      tripId,
      baseCurrency,
      totalExpenses: balanceResult.totalExpenses,
      expenseCount: expenses.length,
      hasGroups: true,
      participants: balanceResult.participants,
      suggestedSettlements,
      entities,
      entitySettlements,
      settledSettlements,
    };
  }

  return {
    tripId,
    baseCurrency,
    totalExpenses: balanceResult.totalExpenses,
    expenseCount: expenses.length,
    hasGroups: false,
    participants: balanceResult.participants,
    suggestedSettlements,
    settledSettlements,
  };
}
