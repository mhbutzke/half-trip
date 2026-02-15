import { describe, it, expect } from 'vitest';
import { calculateBalances, validateBalances } from '../calculate-balance';
import type { ExpenseData, ParticipantData } from '../types';

const members: ParticipantData[] = [
  {
    participantId: 'alice',
    participantName: 'Alice',
    participantAvatar: null,
    participantType: 'member',
  },
  {
    participantId: 'bob',
    participantName: 'Bob',
    participantAvatar: null,
    participantType: 'member',
  },
  {
    participantId: 'carol',
    participantName: 'Carol',
    participantAvatar: null,
    participantType: 'member',
  },
];

describe('calculateBalances with multi-currency', () => {
  it('should handle single currency (exchangeRate = 1)', () => {
    const expenses: ExpenseData[] = [
      {
        id: 'e1',
        amount: 300,
        paidByParticipantId: 'alice',
        exchangeRate: 1,
        splits: [
          { participantId: 'alice', amount: 100 },
          { participantId: 'bob', amount: 100 },
          { participantId: 'carol', amount: 100 },
        ],
      },
    ];

    const result = calculateBalances(expenses, members);
    expect(result.totalExpenses).toBe(300);
    expect(validateBalances(result.participants)).toBe(true);

    const alice = result.participants.find((p) => p.participantId === 'alice')!;
    expect(alice.totalPaid).toBe(300);
    expect(alice.totalOwed).toBe(100);
    expect(alice.netBalance).toBeCloseTo(200);
  });

  it('should convert expenses using exchangeRate for base currency', () => {
    // Trip base: BRL. Expense in USD with rate 5.78
    const expenses: ExpenseData[] = [
      {
        id: 'e1',
        amount: 100, // 100 USD
        paidByParticipantId: 'alice',
        exchangeRate: 5.78, // 1 USD = 5.78 BRL
        splits: [
          { participantId: 'alice', amount: 50 }, // 50 USD
          { participantId: 'bob', amount: 50 }, // 50 USD
        ],
      },
    ];

    const result = calculateBalances(expenses, members);
    // Total should be 100 * 5.78 = 578 BRL
    expect(result.totalExpenses).toBeCloseTo(578);

    const alice = result.participants.find((p) => p.participantId === 'alice')!;
    // Alice paid 578 BRL, owes 289 BRL (50/100 * 578)
    expect(alice.totalPaid).toBeCloseTo(578);
    expect(alice.totalOwed).toBeCloseTo(289);
    expect(alice.netBalance).toBeCloseTo(289);

    const bob = result.participants.find((p) => p.participantId === 'bob')!;
    expect(bob.totalPaid).toBe(0);
    expect(bob.totalOwed).toBeCloseTo(289);
    expect(bob.netBalance).toBeCloseTo(-289);

    expect(validateBalances(result.participants)).toBe(true);
  });

  it('should handle mixed currencies in the same trip', () => {
    // Trip base: EUR
    // Expense 1: 100 EUR (rate 1) paid by Alice, split equally
    // Expense 2: 200 BRL (rate 0.18) = 36 EUR paid by Bob, split equally
    const expenses: ExpenseData[] = [
      {
        id: 'e1',
        amount: 100,
        paidByParticipantId: 'alice',
        exchangeRate: 1,
        splits: [
          { participantId: 'alice', amount: 50 },
          { participantId: 'bob', amount: 50 },
        ],
      },
      {
        id: 'e2',
        amount: 200,
        paidByParticipantId: 'bob',
        exchangeRate: 0.18,
        splits: [
          { participantId: 'alice', amount: 100 },
          { participantId: 'bob', amount: 100 },
        ],
      },
    ];

    const result = calculateBalances(expenses, members);
    // Total: 100 * 1 + 200 * 0.18 = 100 + 36 = 136 EUR
    expect(result.totalExpenses).toBeCloseTo(136);

    const alice = result.participants.find((p) => p.participantId === 'alice')!;
    // Alice paid: 100 EUR. Owes: 50/100 * 100 + 100/200 * 36 = 50 + 18 = 68
    expect(alice.totalPaid).toBeCloseTo(100);
    expect(alice.totalOwed).toBeCloseTo(68);
    expect(alice.netBalance).toBeCloseTo(32);

    const bob = result.participants.find((p) => p.participantId === 'bob')!;
    // Bob paid: 36 EUR. Owes: 50/100 * 100 + 100/200 * 36 = 50 + 18 = 68
    expect(bob.totalPaid).toBeCloseTo(36);
    expect(bob.totalOwed).toBeCloseTo(68);
    expect(bob.netBalance).toBeCloseTo(-32);

    expect(validateBalances(result.participants)).toBe(true);
  });

  it('should handle expenses with 3 different currencies', () => {
    // Trip base: BRL
    // Expense 1: 100 BRL (rate 1) paid by Alice
    // Expense 2: 50 USD (rate 5) = 250 BRL paid by Bob
    // Expense 3: 80 EUR (rate 6) = 480 BRL paid by Carol
    const expenses: ExpenseData[] = [
      {
        id: 'e1',
        amount: 100,
        paidByParticipantId: 'alice',
        exchangeRate: 1,
        splits: [
          { participantId: 'alice', amount: 34 },
          { participantId: 'bob', amount: 33 },
          { participantId: 'carol', amount: 33 },
        ],
      },
      {
        id: 'e2',
        amount: 50,
        paidByParticipantId: 'bob',
        exchangeRate: 5,
        splits: [
          { participantId: 'alice', amount: 17 },
          { participantId: 'bob', amount: 17 },
          { participantId: 'carol', amount: 16 },
        ],
      },
      {
        id: 'e3',
        amount: 80,
        paidByParticipantId: 'carol',
        exchangeRate: 6,
        splits: [
          { participantId: 'alice', amount: 27 },
          { participantId: 'bob', amount: 27 },
          { participantId: 'carol', amount: 26 },
        ],
      },
    ];

    const result = calculateBalances(expenses, members);
    // Total: 100 + 250 + 480 = 830 BRL
    expect(result.totalExpenses).toBeCloseTo(830);
    expect(validateBalances(result.participants)).toBe(true);
  });

  it('should default exchangeRate to 1 when undefined', () => {
    const expenses: ExpenseData[] = [
      {
        id: 'e1',
        amount: 100,
        paidByParticipantId: 'alice',
        exchangeRate: undefined as unknown as number,
        splits: [
          { participantId: 'alice', amount: 50 },
          { participantId: 'bob', amount: 50 },
        ],
      },
    ];

    const result = calculateBalances(expenses, members);
    expect(result.totalExpenses).toBe(100);
  });

  it('should handle zero amount expenses gracefully', () => {
    const expenses: ExpenseData[] = [
      {
        id: 'e1',
        amount: 0,
        paidByParticipantId: 'alice',
        exchangeRate: 5,
        splits: [
          { participantId: 'alice', amount: 0 },
          { participantId: 'bob', amount: 0 },
        ],
      },
    ];

    const result = calculateBalances(expenses, members);
    expect(result.totalExpenses).toBe(0);
    expect(validateBalances(result.participants)).toBe(true);
  });
});
