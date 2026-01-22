/**
 * Unit Tests for Settlement Calculation
 *
 * These tests verify the debt simplification algorithm that minimizes
 * the number of transactions needed to settle all debts.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSettlements,
  getSettlementParticipantCount,
  getSettlementsForUser,
  getTotalOutgoing,
  getTotalIncoming,
} from './calculate-settlements';
import type { ParticipantBalance } from './types';

describe('Settlement Calculation', () => {
  describe('calculateSettlements', () => {
    it('should return empty array when all participants are settled', () => {
      const balances: ParticipantBalance[] = [
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
          totalPaid: 50,
          totalOwed: 50,
          netBalance: 0,
        },
      ];

      const settlements = calculateSettlements(balances);

      expect(settlements).toHaveLength(0);
    });

    it('should create single settlement for two people', () => {
      const balances: ParticipantBalance[] = [
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

      const settlements = calculateSettlements(balances);

      expect(settlements).toHaveLength(1);
      expect(settlements[0].from.userId).toBe('user-2'); // Bob owes
      expect(settlements[0].to.userId).toBe('user-1'); // Alice is owed
      expect(settlements[0].amount).toBe(50);
    });

    it('should minimize number of settlements for three people', () => {
      const balances: ParticipantBalance[] = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 150,
          totalOwed: 50,
          netBalance: 100, // Owed $100
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 50,
          netBalance: -50, // Owes $50
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 50,
          netBalance: -50, // Owes $50
        },
      ];

      const settlements = calculateSettlements(balances);

      // Should be 2 settlements: Bob -> Alice, Carol -> Alice
      expect(settlements).toHaveLength(2);

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(100);

      // All settlements should be to Alice
      expect(settlements.every((s) => s.to.userId === 'user-1')).toBe(true);
    });

    it('should handle complex scenario with multiple creditors and debtors', () => {
      const balances: ParticipantBalance[] = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 120,
          totalOwed: 40,
          netBalance: 80, // Owed $80
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 60,
          totalOwed: 40,
          netBalance: 20, // Owed $20
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 40,
          netBalance: -40, // Owes $40
        },
        {
          userId: 'user-4',
          userName: 'Dave',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 60,
          netBalance: -60, // Owes $60
        },
      ];

      const settlements = calculateSettlements(balances);

      // Total owed to creditors: $80 + $20 = $100
      // Total owed by debtors: $40 + $60 = $100
      // Should be balanced

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBeCloseTo(100, 1);

      // No more than 3 settlements needed (worst case for 4 people)
      expect(settlements.length).toBeLessThanOrEqual(3);
    });

    it('should round amounts to 2 decimal places', () => {
      const balances: ParticipantBalance[] = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 100,
          totalOwed: 33.33,
          netBalance: 66.67,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 33.34,
          netBalance: -33.34,
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 33.33,
          netBalance: -33.33,
        },
      ];

      const settlements = calculateSettlements(balances);

      for (const settlement of settlements) {
        // Check that amount has at most 2 decimal places
        const decimalPlaces = (settlement.amount.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      }
    });

    it('should handle floating point precision issues', () => {
      const balances: ParticipantBalance[] = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 100,
          totalOwed: 33.333333,
          netBalance: 66.666667,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 33.333333,
          netBalance: -33.333333,
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 33.333334,
          netBalance: -33.333334,
        },
      ];

      const settlements = calculateSettlements(balances);

      // Should not crash and should produce settlements
      expect(settlements.length).toBeGreaterThan(0);

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBeCloseTo(66.67, 1);
    });

    it('should ignore very small balances (< 0.01)', () => {
      const balances: ParticipantBalance[] = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 50,
          totalOwed: 50,
          netBalance: 0.005, // Very small positive
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 50,
          totalOwed: 50,
          netBalance: -0.005, // Very small negative
        },
      ];

      const settlements = calculateSettlements(balances);

      // Should not create settlement for amounts < 0.01
      expect(settlements).toHaveLength(0);
    });

    it('should match largest creditors with largest debtors (greedy algorithm)', () => {
      const balances: ParticipantBalance[] = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 100,
          totalOwed: 0,
          netBalance: 100, // Largest creditor
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 60,
          netBalance: -60, // Largest debtor
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 40,
          netBalance: -40, // Smaller debtor
        },
      ];

      const settlements = calculateSettlements(balances);

      // First settlement should be largest debtor to largest creditor
      const firstSettlement = settlements[0];
      expect(firstSettlement.from.userId).toBe('user-2'); // Bob (largest debtor)
      expect(firstSettlement.to.userId).toBe('user-1'); // Alice (largest creditor)
      expect(firstSettlement.amount).toBe(60);

      // Second settlement should be Carol to Alice
      const secondSettlement = settlements[1];
      expect(secondSettlement.from.userId).toBe('user-3'); // Carol
      expect(secondSettlement.to.userId).toBe('user-1'); // Alice
      expect(secondSettlement.amount).toBe(40);
    });

    it('should handle case where one creditor receives from multiple debtors', () => {
      const balances: ParticipantBalance[] = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userAvatar: null,
          totalPaid: 150,
          totalOwed: 50,
          netBalance: 100,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 30,
          netBalance: -30,
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 40,
          netBalance: -40,
        },
        {
          userId: 'user-4',
          userName: 'Dave',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 30,
          netBalance: -30,
        },
      ];

      const settlements = calculateSettlements(balances);

      // All settlements should be to Alice
      expect(settlements.every((s) => s.to.userId === 'user-1')).toBe(true);

      // Total should equal what Alice is owed
      const totalToAlice = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalToAlice).toBeCloseTo(100, 1);
    });

    it('should handle case where one debtor pays multiple creditors', () => {
      const balances: ParticipantBalance[] = [
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
          totalPaid: 60,
          totalOwed: 50,
          netBalance: 10,
        },
        {
          userId: 'user-3',
          userName: 'Carol',
          userAvatar: null,
          totalPaid: 40,
          totalOwed: 50,
          netBalance: -10,
        },
        {
          userId: 'user-4',
          userName: 'Dave',
          userAvatar: null,
          totalPaid: 0,
          totalOwed: 50,
          netBalance: -50,
        },
      ];

      const settlements = calculateSettlements(balances);

      // Dave should pay both Alice and Bob
      const daveSettlements = settlements.filter((s) => s.from.userId === 'user-4');
      expect(daveSettlements.length).toBeGreaterThan(0);

      const totalFromDave = daveSettlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalFromDave).toBeCloseTo(50, 1);
    });
  });

  describe('getSettlementParticipantCount', () => {
    it('should count unique participants across settlements', () => {
      const settlements = [
        {
          from: { userId: 'user-1', userName: 'Alice', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 50,
        },
        {
          from: { userId: 'user-3', userName: 'Carol', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 30,
        },
      ];

      const count = getSettlementParticipantCount(settlements);

      expect(count).toBe(3); // Alice, Bob, Carol
    });

    it('should return 0 for empty settlements', () => {
      const count = getSettlementParticipantCount([]);

      expect(count).toBe(0);
    });
  });

  describe('getSettlementsForUser', () => {
    it('should separate outgoing and incoming settlements', () => {
      const settlements = [
        {
          from: { userId: 'user-1', userName: 'Alice', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 50,
        },
        {
          from: { userId: 'user-3', userName: 'Carol', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 30,
        },
        {
          from: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          to: { userId: 'user-4', userName: 'Dave', userAvatar: null },
          amount: 20,
        },
      ];

      const bobSettlements = getSettlementsForUser(settlements, 'user-2');

      expect(bobSettlements.incoming).toHaveLength(2); // From Alice and Carol
      expect(bobSettlements.outgoing).toHaveLength(1); // To Dave
    });

    it('should return empty arrays for user not in settlements', () => {
      const settlements = [
        {
          from: { userId: 'user-1', userName: 'Alice', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 50,
        },
      ];

      const carolSettlements = getSettlementsForUser(settlements, 'user-3');

      expect(carolSettlements.incoming).toHaveLength(0);
      expect(carolSettlements.outgoing).toHaveLength(0);
    });
  });

  describe('getTotalOutgoing', () => {
    it('should sum all outgoing payments for a user', () => {
      const settlements = [
        {
          from: { userId: 'user-1', userName: 'Alice', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 50,
        },
        {
          from: { userId: 'user-1', userName: 'Alice', userAvatar: null },
          to: { userId: 'user-3', userName: 'Carol', userAvatar: null },
          amount: 30,
        },
      ];

      const total = getTotalOutgoing(settlements, 'user-1');

      expect(total).toBe(80);
    });

    it('should return 0 for user with no outgoing payments', () => {
      const settlements = [
        {
          from: { userId: 'user-1', userName: 'Alice', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 50,
        },
      ];

      const total = getTotalOutgoing(settlements, 'user-2');

      expect(total).toBe(0);
    });
  });

  describe('getTotalIncoming', () => {
    it('should sum all incoming payments for a user', () => {
      const settlements = [
        {
          from: { userId: 'user-1', userName: 'Alice', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 50,
        },
        {
          from: { userId: 'user-3', userName: 'Carol', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 30,
        },
      ];

      const total = getTotalIncoming(settlements, 'user-2');

      expect(total).toBe(80);
    });

    it('should return 0 for user with no incoming payments', () => {
      const settlements = [
        {
          from: { userId: 'user-1', userName: 'Alice', userAvatar: null },
          to: { userId: 'user-2', userName: 'Bob', userAvatar: null },
          amount: 50,
        },
      ];

      const total = getTotalIncoming(settlements, 'user-1');

      expect(total).toBe(0);
    });
  });
});
