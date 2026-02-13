import { describe, it, expect } from 'vitest';
import { computeTripRecap, getCategoryLabel } from './trip-recap';

const mockInput = {
  trip: {
    name: 'Lisboa 2026',
    destination: 'Lisboa',
    startDate: '2026-01-10',
    endDate: '2026-01-17',
    baseCurrency: 'BRL',
  },
  expenses: [
    { amount: 200, category: 'food', paidByName: 'Alice', exchangeRate: 1 },
    { amount: 150, category: 'food', paidByName: 'Bob', exchangeRate: 1 },
    { amount: 500, category: 'accommodation', paidByName: 'Alice', exchangeRate: 1 },
    { amount: 100, category: 'transport', paidByName: 'Carol', exchangeRate: 1 },
    { amount: 80, category: 'tickets', paidByName: 'Bob', exchangeRate: 1 },
  ],
  participants: [
    { name: 'Alice', avatar: null },
    { name: 'Bob', avatar: null },
    { name: 'Carol', avatar: null },
  ],
  activitiesCount: 12,
  checklistCompletionPercent: 85,
};

describe('computeTripRecap', () => {
  it('should compute total spent', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.totalSpent).toBe(1030);
  });

  it('should compute duration in days', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.durationDays).toBe(7);
  });

  it('should find top category', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.topCategory).toBe('accommodation');
    expect(recap.topCategoryAmount).toBe(500);
  });

  it('should find biggest spender', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.biggestSpender).toBe('Alice');
    expect(recap.biggestSpenderAmount).toBe(700);
  });

  it('should compute average per day', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.averagePerDay).toBeCloseTo(147.14, 1);
  });

  it('should compute average per person', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.averagePerPerson).toBeCloseTo(343.33, 1);
  });

  it('should include participant count', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.participantCount).toBe(3);
  });

  it('should return expense count', () => {
    const recap = computeTripRecap(mockInput);
    expect(recap.expenseCount).toBe(5);
  });
});

describe('getCategoryLabel', () => {
  it('should return Portuguese label for known category', () => {
    expect(getCategoryLabel('food')).toBe('Alimentação');
  });

  it('should return the category itself for unknown category', () => {
    expect(getCategoryLabel('custom')).toBe('custom');
  });
});
