import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExpenseSplits } from './use-expense-splits';
import type { ExpenseFormValues } from '@/lib/validation/expense-schemas';

// Mock the sonner toast module
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

const mockedToastError = vi.mocked(toast.error);

beforeEach(() => {
  vi.clearAllMocks();
});

/** Helper to build a minimal ExpenseFormValues for testing */
function buildFormData(overrides: Partial<ExpenseFormValues> = {}): ExpenseFormValues {
  return {
    description: 'Test expense',
    amount: '100',
    currency: 'BRL',
    date: '2025-01-15',
    category: 'food',
    paid_by: 'user-payer',
    split_type: 'equal',
    selected_members: ['user-1', 'user-2'],
    ...overrides,
  };
}

describe('useExpenseSplits', () => {
  // ---------------------------------------------------------------------------
  // Equal splits
  // ---------------------------------------------------------------------------
  describe('equal split type', () => {
    it('divides evenly among two members', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        split_type: 'equal',
        selected_members: ['user-1', 'user-2'],
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.splits).toHaveLength(2);
      expect(splitResult!.amount).toBe(100);
      expect(splitResult!.exchangeRate).toBe(1);

      const sum = splitResult!.splits.reduce((acc, s) => acc + s.amount, 0);
      expect(sum).toBeCloseTo(100, 2);
    });

    it('divides evenly among three members with remainder', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        split_type: 'equal',
        selected_members: ['user-1', 'user-2', 'user-3'],
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.splits).toHaveLength(3);

      // First member gets the remainder
      expect(splitResult!.splits[0].amount).toBeCloseTo(33.34, 2);
      expect(splitResult!.splits[1].amount).toBeCloseTo(33.33, 2);
      expect(splitResult!.splits[2].amount).toBeCloseTo(33.33, 2);

      const sum = splitResult!.splits.reduce((acc, s) => acc + s.amount, 0);
      expect(sum).toBeCloseTo(100, 2);
    });

    it('assigns correct user IDs in splits', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '200',
        split_type: 'equal',
        selected_members: ['alice', 'bob'],
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult!.splits[0].user_id).toBe('alice');
      expect(splitResult!.splits[1].user_id).toBe('bob');
    });

    it('handles single member', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '75,50',
        split_type: 'equal',
        selected_members: ['user-1'],
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.splits).toHaveLength(1);
      expect(splitResult!.splits[0].amount).toBe(75.5);
      expect(splitResult!.splits[0].user_id).toBe('user-1');
    });
  });

  // ---------------------------------------------------------------------------
  // By amount splits
  // ---------------------------------------------------------------------------
  describe('by_amount split type', () => {
    it('uses custom amounts for each member', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        split_type: 'by_amount',
        selected_members: ['user-1', 'user-2'],
        custom_amounts: {
          'user-1': '60',
          'user-2': '40',
        },
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.splits).toHaveLength(2);
      expect(splitResult!.splits[0].amount).toBe(60);
      expect(splitResult!.splits[1].amount).toBe(40);
    });

    it('returns null when amounts do not sum to total', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        split_type: 'by_amount',
        selected_members: ['user-1', 'user-2'],
        custom_amounts: {
          'user-1': '60',
          'user-2': '30',
        },
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).toBeNull();
      expect(mockedToastError).toHaveBeenCalledTimes(1);
      // Should mention the difference
      expect(mockedToastError.mock.calls[0][0]).toContain('difere do total');
    });

    it('succeeds when amounts match total exactly', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '150',
        split_type: 'by_amount',
        selected_members: ['user-1', 'user-2', 'user-3'],
        custom_amounts: {
          'user-1': '50',
          'user-2': '50',
          'user-3': '50',
        },
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.splits).toHaveLength(3);
      expect(splitResult!.amount).toBe(150);
    });

    it('handles comma decimal separator in custom amounts', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        split_type: 'by_amount',
        selected_members: ['user-1', 'user-2'],
        custom_amounts: {
          'user-1': '33,33',
          'user-2': '66,67',
        },
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.splits[0].amount).toBeCloseTo(33.33, 2);
      expect(splitResult!.splits[1].amount).toBeCloseTo(66.67, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // By percentage splits
  // ---------------------------------------------------------------------------
  describe('by_percentage split type', () => {
    it('calculates amounts from percentages', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '200',
        split_type: 'by_percentage',
        selected_members: ['user-1', 'user-2'],
        custom_percentages: {
          'user-1': '60',
          'user-2': '40',
        },
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.splits).toHaveLength(2);
      expect(splitResult!.splits[0].amount).toBe(120);
      expect(splitResult!.splits[0].percentage).toBe(60);
      expect(splitResult!.splits[1].amount).toBe(80);
      expect(splitResult!.splits[1].percentage).toBe(40);
    });

    it('returns null when percentages do not sum to 100', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '200',
        split_type: 'by_percentage',
        selected_members: ['user-1', 'user-2'],
        custom_percentages: {
          'user-1': '60',
          'user-2': '30',
        },
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).toBeNull();
      expect(mockedToastError).toHaveBeenCalledTimes(1);
      expect(mockedToastError.mock.calls[0][0]).toContain('difere de 100%');
    });

    it('succeeds when percentages sum to 100', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '300',
        split_type: 'by_percentage',
        selected_members: ['user-1', 'user-2', 'user-3'],
        custom_percentages: {
          'user-1': '50',
          'user-2': '30',
          'user-3': '20',
        },
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.splits[0].amount).toBe(150);
      expect(splitResult!.splits[1].amount).toBe(90);
      expect(splitResult!.splits[2].amount).toBe(60);
    });

    it('handles decimal percentages', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        split_type: 'by_percentage',
        selected_members: ['user-1', 'user-2', 'user-3'],
        custom_percentages: {
          'user-1': '33.34',
          'user-2': '33.33',
          'user-3': '33.33',
        },
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      const sum = splitResult!.splits.reduce((acc, s) => acc + s.amount, 0);
      expect(sum).toBeCloseTo(100, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // Invalid inputs
  // ---------------------------------------------------------------------------
  describe('invalid inputs', () => {
    it('returns null and shows toast when amount is 0', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({ amount: '0' });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).toBeNull();
      expect(mockedToastError).toHaveBeenCalledWith('Valor deve ser maior que zero');
    });

    it('returns null and shows toast when amount is negative', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({ amount: '-50' });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).toBeNull();
      expect(mockedToastError).toHaveBeenCalledWith('Valor deve ser maior que zero');
    });

    it('returns null and shows toast when amount is empty string', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({ amount: '' });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).toBeNull();
      expect(mockedToastError).toHaveBeenCalledWith('Valor deve ser maior que zero');
    });

    it('returns null and shows toast when amount is non-numeric', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({ amount: 'abc' });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).toBeNull();
      expect(mockedToastError).toHaveBeenCalledWith('Valor deve ser maior que zero');
    });
  });

  // ---------------------------------------------------------------------------
  // Exchange rate
  // ---------------------------------------------------------------------------
  describe('exchange rate', () => {
    it('returns exchangeRate = 1 when no exchange_rate is provided', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        currency: 'BRL',
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.exchangeRate).toBe(1);
    });

    it('parses exchange_rate when provided', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        currency: 'USD',
        exchange_rate: '5,25',
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.exchangeRate).toBe(5.25);
    });

    it('returns null when currency differs from base and exchange rate is 0', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        currency: 'USD',
        exchange_rate: '0',
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).toBeNull();
      expect(mockedToastError).toHaveBeenCalledWith('Taxa de câmbio deve ser maior que zero');
    });

    it('allows exchange rate of 0 when currency matches base currency', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        currency: 'BRL',
        exchange_rate: '0',
      });

      // When currency === baseCurrency, the exchange rate check is skipped
      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.exchangeRate).toBe(0);
    });

    it('returns null when currency differs and exchange_rate is negative', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        currency: 'EUR',
        exchange_rate: '-1',
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).toBeNull();
      expect(mockedToastError).toHaveBeenCalledWith('Taxa de câmbio deve ser maior que zero');
    });
  });

  // ---------------------------------------------------------------------------
  // Return shape
  // ---------------------------------------------------------------------------
  describe('return shape', () => {
    it('returns correct structure with splits, amount, and exchangeRate', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '250,50',
        currency: 'USD',
        exchange_rate: '5,10',
        split_type: 'equal',
        selected_members: ['user-1', 'user-2'],
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult).toHaveProperty('splits');
      expect(splitResult).toHaveProperty('amount');
      expect(splitResult).toHaveProperty('exchangeRate');
      expect(splitResult!.amount).toBe(250.5);
      expect(splitResult!.exchangeRate).toBe(5.1);
      expect(Array.isArray(splitResult!.splits)).toBe(true);
    });

    it('each split has user_id, amount, and percentage', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '100',
        split_type: 'equal',
        selected_members: ['user-1', 'user-2'],
      });

      const splitResult = result.current.calculateSplits(data);

      for (const split of splitResult!.splits) {
        expect(split).toHaveProperty('user_id');
        expect(split).toHaveProperty('amount');
        expect(split).toHaveProperty('percentage');
        expect(typeof split.user_id).toBe('string');
        expect(typeof split.amount).toBe('number');
        expect(typeof split.percentage).toBe('number');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Different base currencies
  // ---------------------------------------------------------------------------
  describe('different base currencies', () => {
    it('validates exchange rate against the provided base currency', () => {
      const { result } = renderHook(() => useExpenseSplits('USD'));

      // Expense in BRL with exchange rate, base is USD
      const data = buildFormData({
        amount: '500',
        currency: 'BRL',
        exchange_rate: '0,20',
        split_type: 'equal',
        selected_members: ['user-1', 'user-2'],
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.exchangeRate).toBe(0.2);
      expect(splitResult!.amount).toBe(500);
    });

    it('skips exchange rate validation when expense currency matches base', () => {
      const { result } = renderHook(() => useExpenseSplits('EUR'));

      const data = buildFormData({
        amount: '100',
        currency: 'EUR',
        split_type: 'equal',
        selected_members: ['user-1'],
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.exchangeRate).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Comma-formatted amounts
  // ---------------------------------------------------------------------------
  describe('comma-formatted amounts', () => {
    it('parses amount with comma decimal separator', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '99,99',
        split_type: 'equal',
        selected_members: ['user-1'],
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.amount).toBe(99.99);
    });

    it('parses amount with dot decimal separator', () => {
      const { result } = renderHook(() => useExpenseSplits('BRL'));

      const data = buildFormData({
        amount: '99.99',
        split_type: 'equal',
        selected_members: ['user-1'],
      });

      const splitResult = result.current.calculateSplits(data);

      expect(splitResult).not.toBeNull();
      expect(splitResult!.amount).toBe(99.99);
    });
  });
});
