/**
 * Unit Tests for Balance Calculation
 *
 * These tests verify the core balance calculation logic for Half Trip,
 * ensuring accurate tracking of who paid what and who owes what.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBalances,
  calculateBalancesWithSettlements,
  getCreditors,
  getDebtors,
  getSettled,
  validateBalances,
  formatCurrency,
} from './calculate-balance';
import type { ExpenseData, TripMemberData, PersistedSettlement } from './types';

describe('Balance Calculation', () => {
  describe('calculateBalances', () => {
    it('should return zero balances when there are no expenses', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
      ];

      const result = calculateBalances([], members);

      expect(result.totalExpenses).toBe(0);
      expect(result.participantCount).toBe(2);
      expect(result.participants).toHaveLength(2);

      for (const participant of result.participants) {
        expect(participant.totalPaid).toBe(0);
        expect(participant.totalOwed).toBe(0);
        expect(participant.netBalance).toBe(0);
      }
    });

    it('should calculate balance for single expense with equal splits', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
      ];

      const expenses: ExpenseData[] = [
        {
          id: 'expense-1',
          amount: 100,
          paidById: 'user-1',
          splits: [
            { userId: 'user-1', amount: 50 },
            { userId: 'user-2', amount: 50 },
          ],
        },
      ];

      const result = calculateBalances(expenses, members);

      expect(result.totalExpenses).toBe(100);
      expect(result.participants).toHaveLength(2);

      // Alice paid $100, owes $50 -> net +$50
      const alice = result.participants.find((p) => p.userId === 'user-1');
      expect(alice).toBeDefined();
      expect(alice?.totalPaid).toBe(100);
      expect(alice?.totalOwed).toBe(50);
      expect(alice?.netBalance).toBe(50);

      // Bob paid $0, owes $50 -> net -$50
      const bob = result.participants.find((p) => p.userId === 'user-2');
      expect(bob).toBeDefined();
      expect(bob?.totalPaid).toBe(0);
      expect(bob?.totalOwed).toBe(50);
      expect(bob?.netBalance).toBe(-50);
    });

    it('should calculate balances for multiple expenses', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
        { userId: 'user-3', userName: 'Carol', userAvatar: null },
      ];

      const expenses: ExpenseData[] = [
        {
          id: 'expense-1',
          amount: 120,
          paidById: 'user-1', // Alice pays $120
          splits: [
            { userId: 'user-1', amount: 40 },
            { userId: 'user-2', amount: 40 },
            { userId: 'user-3', amount: 40 },
          ],
        },
        {
          id: 'expense-2',
          amount: 60,
          paidById: 'user-2', // Bob pays $60
          splits: [
            { userId: 'user-1', amount: 20 },
            { userId: 'user-2', amount: 20 },
            { userId: 'user-3', amount: 20 },
          ],
        },
      ];

      const result = calculateBalances(expenses, members);

      expect(result.totalExpenses).toBe(180);
      expect(result.participants).toHaveLength(3);

      // Alice: paid $120, owes $60 -> net +$60
      const alice = result.participants.find((p) => p.userId === 'user-1');
      expect(alice?.totalPaid).toBe(120);
      expect(alice?.totalOwed).toBe(60);
      expect(alice?.netBalance).toBe(60);

      // Bob: paid $60, owes $60 -> net $0
      const bob = result.participants.find((p) => p.userId === 'user-2');
      expect(bob?.totalPaid).toBe(60);
      expect(bob?.totalOwed).toBe(60);
      expect(bob?.netBalance).toBe(0);

      // Carol: paid $0, owes $60 -> net -$60
      const carol = result.participants.find((p) => p.userId === 'user-3');
      expect(carol?.totalPaid).toBe(0);
      expect(carol?.totalOwed).toBe(60);
      expect(carol?.netBalance).toBe(-60);
    });

    it('should handle unequal splits correctly', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
      ];

      const expenses: ExpenseData[] = [
        {
          id: 'expense-1',
          amount: 100,
          paidById: 'user-1',
          splits: [
            { userId: 'user-1', amount: 30 }, // Alice owes 30%
            { userId: 'user-2', amount: 70 }, // Bob owes 70%
          ],
        },
      ];

      const result = calculateBalances(expenses, members);

      const alice = result.participants.find((p) => p.userId === 'user-1');
      expect(alice?.netBalance).toBe(70); // paid 100, owed 30

      const bob = result.participants.find((p) => p.userId === 'user-2');
      expect(bob?.netBalance).toBe(-70); // paid 0, owed 70
    });

    it('should sort participants by net balance descending', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
        { userId: 'user-3', userName: 'Carol', userAvatar: null },
      ];

      const expenses: ExpenseData[] = [
        {
          id: 'expense-1',
          amount: 150,
          paidById: 'user-1',
          splits: [
            { userId: 'user-1', amount: 50 },
            { userId: 'user-2', amount: 50 },
            { userId: 'user-3', amount: 50 },
          ],
        },
      ];

      const result = calculateBalances(expenses, members);

      // Alice should be first (net +100)
      expect(result.participants[0].userId).toBe('user-1');
      expect(result.participants[0].netBalance).toBe(100);

      // Bob and Carol should be next (net -50 each)
      expect(result.participants[1].netBalance).toBe(-50);
      expect(result.participants[2].netBalance).toBe(-50);
    });

    it('should handle expenses with decimal amounts', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
      ];

      const expenses: ExpenseData[] = [
        {
          id: 'expense-1',
          amount: 33.33,
          paidById: 'user-1',
          splits: [
            { userId: 'user-1', amount: 16.67 },
            { userId: 'user-2', amount: 16.66 },
          ],
        },
      ];

      const result = calculateBalances(expenses, members);

      const alice = result.participants.find((p) => p.userId === 'user-1');
      expect(alice?.netBalance).toBeCloseTo(16.66, 2);

      const bob = result.participants.find((p) => p.userId === 'user-2');
      expect(bob?.netBalance).toBeCloseTo(-16.66, 2);
    });

    it('should handle members who did not participate in any expenses', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
        { userId: 'user-3', userName: 'Carol', userAvatar: null },
      ];

      const expenses: ExpenseData[] = [
        {
          id: 'expense-1',
          amount: 100,
          paidById: 'user-1',
          splits: [
            { userId: 'user-1', amount: 50 },
            { userId: 'user-2', amount: 50 },
            // Carol not included in this expense
          ],
        },
      ];

      const result = calculateBalances(expenses, members);

      const carol = result.participants.find((p) => p.userId === 'user-3');
      expect(carol).toBeDefined();
      expect(carol?.totalPaid).toBe(0);
      expect(carol?.totalOwed).toBe(0);
      expect(carol?.netBalance).toBe(0);
    });
  });

  describe('calculateBalancesWithSettlements', () => {
    it('should adjust balances based on settled settlements', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
      ];

      const expenses: ExpenseData[] = [
        {
          id: 'expense-1',
          amount: 100,
          paidById: 'user-1',
          splits: [
            { userId: 'user-1', amount: 50 },
            { userId: 'user-2', amount: 50 },
          ],
        },
      ];

      // Bob settled his $50 debt to Alice
      const settledSettlements: PersistedSettlement[] = [
        {
          fromUserId: 'user-2',
          toUserId: 'user-1',
          amount: 50,
        },
      ];

      const result = calculateBalancesWithSettlements(expenses, members, settledSettlements);

      // Alice: Originally +50, but received +50 from settlement -> now +0
      const alice = result.participants.find((p) => p.userId === 'user-1');
      expect(alice?.netBalance).toBe(0);

      // Bob: Originally -50, but paid +50 in settlement -> now +0
      const bob = result.participants.find((p) => p.userId === 'user-2');
      expect(bob?.netBalance).toBe(0);
    });

    it('should handle partial settlements', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
      ];

      const expenses: ExpenseData[] = [
        {
          id: 'expense-1',
          amount: 100,
          paidById: 'user-1',
          splits: [
            { userId: 'user-1', amount: 50 },
            { userId: 'user-2', amount: 50 },
          ],
        },
      ];

      // Bob paid $30 of his $50 debt
      const settledSettlements: PersistedSettlement[] = [
        {
          fromUserId: 'user-2',
          toUserId: 'user-1',
          amount: 30,
        },
      ];

      const result = calculateBalancesWithSettlements(expenses, members, settledSettlements);

      // Alice: Originally +50, received +30 -> now +20
      const alice = result.participants.find((p) => p.userId === 'user-1');
      expect(alice?.netBalance).toBe(20);

      // Bob: Originally -50, paid +30 -> now -20
      const bob = result.participants.find((p) => p.userId === 'user-2');
      expect(bob?.netBalance).toBe(-20);
    });

    it('should handle multiple settlements', () => {
      const members: TripMemberData[] = [
        { userId: 'user-1', userName: 'Alice', userAvatar: null },
        { userId: 'user-2', userName: 'Bob', userAvatar: null },
        { userId: 'user-3', userName: 'Carol', userAvatar: null },
      ];

      const expenses: ExpenseData[] = [
        {
          id: 'expense-1',
          amount: 120,
          paidById: 'user-1',
          splits: [
            { userId: 'user-1', amount: 40 },
            { userId: 'user-2', amount: 40 },
            { userId: 'user-3', amount: 40 },
          ],
        },
      ];

      const settledSettlements: PersistedSettlement[] = [
        { fromUserId: 'user-2', toUserId: 'user-1', amount: 40 },
        { fromUserId: 'user-3', toUserId: 'user-1', amount: 20 },
      ];

      const result = calculateBalancesWithSettlements(expenses, members, settledSettlements);

      // Alice: +80 originally, received +60 -> now +20
      const alice = result.participants.find((p) => p.userId === 'user-1');
      expect(alice?.netBalance).toBe(20);

      // Bob: -40 originally, paid +40 -> now 0
      const bob = result.participants.find((p) => p.userId === 'user-2');
      expect(bob?.netBalance).toBe(0);

      // Carol: -40 originally, paid +20 -> now -20
      const carol = result.participants.find((p) => p.userId === 'user-3');
      expect(carol?.netBalance).toBe(-20);
    });
  });

  describe('getCreditors', () => {
    it('should return only participants with positive balance', () => {
      const balances = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 100,
          totalOwed: 50,
          netBalance: 50,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 50,
          totalOwed: 50,
          netBalance: 0,
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 50,
          netBalance: -50,
        },
      ];

      const creditors = getCreditors(balances);

      expect(creditors).toHaveLength(1);
      expect(creditors[0].userId).toBe('user-1');
    });

    it('should return empty array when no creditors exist', () => {
      const balances = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 50,
          totalOwed: 50,
          netBalance: 0,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 50,
          netBalance: -50,
        },
      ];

      const creditors = getCreditors(balances);

      expect(creditors).toHaveLength(0);
    });
  });

  describe('getDebtors', () => {
    it('should return only participants with negative balance', () => {
      const balances = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 100,
          totalOwed: 50,
          netBalance: 50,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 50,
          totalOwed: 50,
          netBalance: 0,
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 50,
          netBalance: -50,
        },
      ];

      const debtors = getDebtors(balances);

      expect(debtors).toHaveLength(1);
      expect(debtors[0].userId).toBe('user-3');
    });
  });

  describe('getSettled', () => {
    it('should return only participants with zero balance', () => {
      const balances = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 100,
          totalOwed: 50,
          netBalance: 50,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 50,
          totalOwed: 50,
          netBalance: 0,
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 50,
          netBalance: -50,
        },
      ];

      const settled = getSettled(balances);

      expect(settled).toHaveLength(1);
      expect(settled[0].userId).toBe('user-2');
    });
  });

  describe('validateBalances', () => {
    it('should return true when balances are valid (sum to zero)', () => {
      const balances = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 100,
          totalOwed: 50,
          netBalance: 50,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 50,
          netBalance: -50,
        },
      ];

      expect(validateBalances(balances)).toBe(true);
    });

    it('should return true with small floating point errors', () => {
      const balances = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 100,
          totalOwed: 50,
          netBalance: 50.005,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 50,
          netBalance: -50.005,
        },
      ];

      expect(validateBalances(balances)).toBe(true);
    });

    it('should return false when balances are invalid', () => {
      const balances = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 100,
          totalOwed: 50,
          netBalance: 50,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 40, // Wrong amount
          netBalance: -40,
        },
      ];

      expect(validateBalances(balances)).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in Brazilian Real', () => {
      const formatted = formatCurrency(100);
      expect(formatted).toContain('R$');
      expect(formatted).toContain('100');
    });

    it('should format decimal amounts correctly', () => {
      const formatted = formatCurrency(123.45);
      expect(formatted).toContain('123,45');
    });

    it('should handle zero amount', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain('0');
    });

    it('should handle negative amounts', () => {
      const formatted = formatCurrency(-50.5);
      expect(formatted).toContain('-');
      expect(formatted).toContain('50,50');
    });
  });
});
