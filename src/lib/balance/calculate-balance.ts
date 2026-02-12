/**
 * Balance Calculation Algorithm
 *
 * This module implements the core balance calculation logic for Half Trip.
 * It takes expenses and their splits, and calculates how much each participant
 * has paid vs. owes, producing a net balance for each person.
 *
 * Algorithm:
 * 1. Initialize balance tracking for each trip member
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
  ExpenseData,
  ParticipantBalance,
  TripMemberData,
  PersistedSettlement,
} from './types';

/**
 * Calculate balances for all participants in a trip
 *
 * @param expenses - Array of expenses with their splits
 * @param members - Array of trip members
 * @returns Balance calculation result with participant balances and totals
 */
export function calculateBalances(
  expenses: ExpenseData[],
  members: TripMemberData[]
): BalanceCalculationResult {
  // Initialize balance tracking for each member
  const balanceMap = new Map<string, ParticipantBalance>();

  for (const member of members) {
    balanceMap.set(member.userId, {
      userId: member.userId,
      userName: member.userName,
      userAvatar: member.userAvatar,
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
    const payer = balanceMap.get(expense.paidById);
    if (payer) {
      payer.totalPaid += convertedAmount;
    }

    // Add split amounts converted to base currency
    // Use ratio to avoid rounding errors from converting each split independently
    for (const split of expense.splits) {
      const participant = balanceMap.get(split.userId);
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
  const participants = Array.from(balanceMap.values()).sort((a, b) => b.netBalance - a.netBalance);

  return {
    participants,
    totalExpenses,
    participantCount: members.length,
  };
}

/**
 * Calculate balances accounting for already settled settlements
 * This function adjusts balances based on settlements that have already been made
 *
 * @param expenses - Array of expenses with their splits
 * @param members - Array of trip members
 * @param settledSettlements - Array of settlements that have already been settled
 * @returns Balance calculation result with adjusted participant balances
 */
export function calculateBalancesWithSettlements(
  expenses: ExpenseData[],
  members: TripMemberData[],
  settledSettlements: PersistedSettlement[]
): BalanceCalculationResult {
  // First calculate base balances from expenses
  const result = calculateBalances(expenses, members);

  // Adjust balances based on settled settlements
  // If A paid B $50, then:
  // - A's balance increases by $50 (they spent money on the settlement)
  // - B's balance decreases by $50 (they received money from the settlement)
  const balanceMap = new Map(result.participants.map((p) => [p.userId, p]));

  for (const settlement of settledSettlements) {
    const fromUser = balanceMap.get(settlement.fromUserId);
    const toUser = balanceMap.get(settlement.toUserId);

    if (fromUser && toUser) {
      // The person who sent money (fromUser) has effectively "paid" more
      fromUser.totalPaid += settlement.amount;
      fromUser.netBalance += settlement.amount;

      // The person who received money (toUser) has effectively "owed" less
      toUser.totalOwed += settlement.amount;
      toUser.netBalance -= settlement.amount;
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
