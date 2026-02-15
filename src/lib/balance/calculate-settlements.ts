/**
 * Settlement Calculation Algorithm
 *
 * This module implements the debt simplification algorithm for Half Trip.
 * It takes participant balances and produces an optimized list of settlements
 * that minimizes the number of transactions needed to settle all debts.
 *
 * All references use participantId (trip_participants.id), supporting both
 * registered users and guests.
 *
 * Algorithm: Greedy Matching
 * 1. Separate participants into creditors (positive balance) and debtors (negative balance)
 * 2. Sort both lists by absolute balance (largest first)
 * 3. Match largest creditor with largest debtor
 * 4. Create settlement for the minimum of the two amounts
 * 5. Update both balances and repeat until all debts are settled
 *
 * Complexity: O(n log n) for sorting, O(n) for matching = O(n log n) overall
 */

import type { ParticipantBalance, Settlement } from './types';

/**
 * Calculate optimized settlements to minimize number of transactions
 *
 * @param balances - Array of participant balances
 * @returns Array of settlement transactions
 */
export function calculateSettlements(balances: ParticipantBalance[]): Settlement[] {
  const settlements: Settlement[] = [];

  // Separate creditors (owed money) and debtors (owe money)
  // Create working copies so we don't mutate the originals
  const creditors = balances
    .filter((b) => b.netBalance > 0.01) // Small threshold to avoid floating point issues
    .map((b) => ({ ...b }))
    .sort((a, b) => b.netBalance - a.netBalance); // Sort by balance descending

  const debtors = balances
    .filter((b) => b.netBalance < -0.01) // Small threshold to avoid floating point issues
    .map((b) => ({ ...b, netBalance: Math.abs(b.netBalance) })) // Make positive for easier math
    .sort((a, b) => b.netBalance - a.netBalance); // Sort by balance descending

  let creditorIndex = 0;
  let debtorIndex = 0;

  // Greedy algorithm: match largest creditor with largest debtor
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    // Amount to settle is the minimum of what creditor is owed and what debtor owes
    const settleAmount = Math.min(creditor.netBalance, debtor.netBalance);

    // Only create settlement if amount is meaningful (avoid floating point artifacts)
    if (settleAmount > 0.01) {
      settlements.push({
        from: {
          participantId: debtor.participantId,
          participantName: debtor.participantName,
          participantAvatar: debtor.participantAvatar,
        },
        to: {
          participantId: creditor.participantId,
          participantName: creditor.participantName,
          participantAvatar: creditor.participantAvatar,
        },
        amount: Math.round(settleAmount * 100) / 100, // Round to 2 decimal places
      });
    }

    // Update balances
    creditor.netBalance -= settleAmount;
    debtor.netBalance -= settleAmount;

    // Move to next creditor if current one is fully settled
    if (creditor.netBalance < 0.01) {
      creditorIndex++;
    }

    // Move to next debtor if current one is fully settled
    if (debtor.netBalance < 0.01) {
      debtorIndex++;
    }
  }

  return settlements;
}

/**
 * Get the total number of unique participants involved in settlements
 */
export function getSettlementParticipantCount(settlements: Settlement[]): number {
  const participants = new Set<string>();

  for (const settlement of settlements) {
    participants.add(settlement.from.participantId);
    participants.add(settlement.to.participantId);
  }

  return participants.size;
}

/**
 * Get all settlements involving a specific participant
 */
export function getSettlementsForParticipant(
  settlements: Settlement[],
  participantId: string
): { outgoing: Settlement[]; incoming: Settlement[] } {
  const outgoing = settlements.filter((s) => s.from.participantId === participantId);
  const incoming = settlements.filter((s) => s.to.participantId === participantId);

  return { outgoing, incoming };
}

/**
 * Calculate the total amount a participant needs to pay out
 */
export function getTotalOutgoing(settlements: Settlement[], participantId: string): number {
  return settlements
    .filter((s) => s.from.participantId === participantId)
    .reduce((sum, s) => sum + s.amount, 0);
}

/**
 * Calculate the total amount a participant should receive
 */
export function getTotalIncoming(settlements: Settlement[], participantId: string): number {
  return settlements
    .filter((s) => s.to.participantId === participantId)
    .reduce((sum, s) => sum + s.amount, 0);
}
