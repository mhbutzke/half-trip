/**
 * Balance Calculation Algorithm
 *
 * This module implements the core balance calculation logic for Half Trip.
 * It takes expenses and their splits, and calculates how much each participant
 * has paid vs. owes, producing a net balance for each person.
 *
 * All references use participantId (trip_participants.id), supporting both
 * registered users and guests.
 *
 * Algorithm:
 * 1. Initialize balance tracking for each trip participant
 * 2. For each expense, add the amount to the payer's "totalPaid"
 * 3. For each expense split, add the split amount to the participant's "totalOwed"
 * 4. Calculate net balance = totalPaid - totalOwed for each participant
 *
 * Net Balance Interpretation:
 * - Positive: Person is owed money (they paid more than their share)
 * - Negative: Person owes money (they paid less than their share)
 * - Zero: Person is settled up
 */

import type {
  BalanceCalculationResult,
  EntityBalance,
  ExpenseData,
  GroupData,
  ParticipantBalance,
  ParticipantData,
  PersistedSettlement,
} from './types';

/**
 * Calculate balances for all participants in a trip
 *
 * @param expenses - Array of expenses with their splits
 * @param participants - Array of trip participants (members + guests)
 * @returns Balance calculation result with participant balances and totals
 */
export function calculateBalances(
  expenses: ExpenseData[],
  participants: ParticipantData[]
): BalanceCalculationResult {
  // Initialize balance tracking for each participant
  const balanceMap = new Map<string, ParticipantBalance>();

  for (const participant of participants) {
    balanceMap.set(participant.participantId, {
      participantId: participant.participantId,
      participantName: participant.participantName,
      participantAvatar: participant.participantAvatar,
      participantType: participant.participantType,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0,
    });
  }

  // Process each expense
  let totalExpenses = 0;

  for (const expense of expenses) {
    const rate = expense.exchangeRate ?? 1;
    const convertedAmount = expense.amount * rate;

    // Add to total expenses (in base currency)
    totalExpenses += convertedAmount;

    // Add converted expense amount to payer's totalPaid
    const payer = balanceMap.get(expense.paidByParticipantId);
    if (payer) {
      payer.totalPaid += convertedAmount;
    }

    // Add split amounts converted to base currency
    // Use ratio to avoid rounding errors from converting each split independently
    for (const split of expense.splits) {
      const participant = balanceMap.get(split.participantId);
      if (participant) {
        const splitRatio = expense.amount > 0 ? split.amount / expense.amount : 0;
        participant.totalOwed += convertedAmount * splitRatio;
      }
    }
  }

  // Calculate net balance for each participant
  // Net balance = totalPaid - totalOwed
  // Positive means they are owed money, negative means they owe money
  for (const balance of balanceMap.values()) {
    balance.netBalance = balance.totalPaid - balance.totalOwed;
  }

  // Convert map to array and sort by net balance (descending)
  // This puts people who are owed money at the top
  const participantBalances = Array.from(balanceMap.values()).sort(
    (a, b) => b.netBalance - a.netBalance
  );

  return {
    participants: participantBalances,
    totalExpenses,
    participantCount: participants.length,
  };
}

/**
 * Calculate balances accounting for already settled settlements
 * This function adjusts balances based on settlements that have already been made
 *
 * @param expenses - Array of expenses with their splits
 * @param participants - Array of trip participants
 * @param settledSettlements - Array of settlements that have already been settled
 * @returns Balance calculation result with adjusted participant balances
 */
export function calculateBalancesWithSettlements(
  expenses: ExpenseData[],
  participants: ParticipantData[],
  settledSettlements: PersistedSettlement[]
): BalanceCalculationResult {
  // First calculate base balances from expenses
  const result = calculateBalances(expenses, participants);

  // Adjust balances based on settled settlements
  // If A paid B $50, then:
  // - A's balance increases by $50 (they spent money on the settlement)
  // - B's balance decreases by $50 (they received money from the settlement)
  const balanceMap = new Map(result.participants.map((p) => [p.participantId, p]));

  for (const settlement of settledSettlements) {
    const fromParticipant = balanceMap.get(settlement.fromParticipantId);
    const toParticipant = balanceMap.get(settlement.toParticipantId);

    if (fromParticipant && toParticipant) {
      // The person who sent money has effectively "paid" more
      fromParticipant.totalPaid += settlement.amount;
      fromParticipant.netBalance += settlement.amount;

      // The person who received money has effectively "owed" less
      toParticipant.totalOwed += settlement.amount;
      toParticipant.netBalance -= settlement.amount;
    }
  }

  // Re-sort by net balance
  const adjustedParticipants = Array.from(balanceMap.values()).sort(
    (a, b) => b.netBalance - a.netBalance
  );

  return {
    ...result,
    participants: adjustedParticipants,
  };
}

/**
 * Get participants who are owed money (positive balance)
 */
export function getCreditors(balances: ParticipantBalance[]): ParticipantBalance[] {
  return balances.filter((b) => b.netBalance > 0);
}

/**
 * Get participants who owe money (negative balance)
 */
export function getDebtors(balances: ParticipantBalance[]): ParticipantBalance[] {
  return balances.filter((b) => b.netBalance < 0);
}

/**
 * Get participants who are settled (zero balance)
 */
export function getSettled(balances: ParticipantBalance[]): ParticipantBalance[] {
  return balances.filter((b) => b.netBalance === 0);
}

/**
 * Validate that total debts equal total credits (accounting check)
 * The sum of all net balances should be zero (or very close due to floating point)
 */
export function validateBalances(balances: ParticipantBalance[]): boolean {
  const totalNet = balances.reduce((sum, b) => sum + b.netBalance, 0);
  // Allow for small floating point errors (within 1 cent)
  return Math.abs(totalNet) < 0.01;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Aggregate individual participant balances into group-level entity balances.
 *
 * Groups act as a single entity: their members' totals are summed together.
 * Participants that don't belong to any group remain as individual entities.
 *
 * @param participantBalances - Array of individual participant balances
 * @param groups - Array of group definitions with member participant IDs
 * @param participants - Array of participant data (used for group member details)
 * @returns Array of EntityBalance sorted by netBalance descending (creditors first)
 */
export function calculateGroupBalances(
  participantBalances: ParticipantBalance[],
  groups: GroupData[],
  participants: ParticipantData[]
): EntityBalance[] {
  // 1. Build a map participantId → groupId
  const participantToGroup = new Map<string, string>();
  for (const group of groups) {
    for (const memberId of group.memberParticipantIds) {
      participantToGroup.set(memberId, group.groupId);
    }
  }

  // Build a lookup for participant data by ID
  const participantDataMap = new Map<string, ParticipantData>();
  for (const p of participants) {
    participantDataMap.set(p.participantId, p);
  }

  // Build a lookup for group data by groupId
  const groupDataMap = new Map<string, GroupData>();
  for (const group of groups) {
    groupDataMap.set(group.groupId, group);
  }

  // Accumulators for group entities
  const groupEntities = new Map<string, { totalPaid: number; totalOwed: number }>();
  for (const group of groups) {
    groupEntities.set(group.groupId, { totalPaid: 0, totalOwed: 0 });
  }

  const entities: EntityBalance[] = [];

  // 2. Process each participant balance
  for (const balance of participantBalances) {
    const groupId = participantToGroup.get(balance.participantId);

    if (groupId) {
      // Participant belongs to a group — aggregate into group totals
      const accum = groupEntities.get(groupId)!;
      accum.totalPaid += balance.totalPaid;
      accum.totalOwed += balance.totalOwed;
    } else {
      // Ungrouped participant — create individual entity
      entities.push({
        entityId: balance.participantId,
        entityType: 'participant',
        displayName: balance.participantName,
        displayAvatar: balance.participantAvatar,
        members: undefined,
        totalPaid: balance.totalPaid,
        totalOwed: balance.totalOwed,
        netBalance: balance.netBalance,
      });
    }
  }

  // 3. Build group entity balances from accumulated totals
  for (const [groupId, accum] of groupEntities) {
    const group = groupDataMap.get(groupId)!;
    const members = group.memberParticipantIds
      .map((id) => participantDataMap.get(id))
      .filter((p): p is ParticipantData => p !== undefined);

    entities.push({
      entityId: groupId,
      entityType: 'group',
      displayName: group.groupName,
      displayAvatar: null,
      members,
      totalPaid: accum.totalPaid,
      totalOwed: accum.totalOwed,
      netBalance: accum.totalPaid - accum.totalOwed,
    });
  }

  // Sort by netBalance descending (creditors first)
  entities.sort((a, b) => b.netBalance - a.netBalance);

  return entities;
}
