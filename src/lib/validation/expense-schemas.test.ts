/**
 * Unit Tests for Expense Split Calculations
 *
 * These tests verify the expense split calculation logic, including
 * equal splits, custom amount splits, and percentage-based splits.
 */

import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  formatAmount,
  formatAmountInput,
  calculateEqualSplits,
  calculateAmountSplits,
  calculatePercentageSplits,
  validateSplitsTotal,
  validatePercentagesTotal,
  formatPercentage,
} from './expense-schemas';

describe('Expense Split Calculations', () => {
  describe('parseAmount', () => {
    it('should parse number string with dot as decimal separator', () => {
      expect(parseAmount('123.45')).toBe(123.45);
    });

    it('should parse number string with comma as decimal separator', () => {
      expect(parseAmount('123,45')).toBe(123.45);
    });

    it('should handle integer strings', () => {
      expect(parseAmount('100')).toBe(100);
    });

    it('should return 0 for empty string', () => {
      expect(parseAmount('')).toBe(0);
    });

    it('should return 0 for invalid input', () => {
      expect(parseAmount('abc')).toBe(0);
    });

    it('should handle strings with multiple separators', () => {
      expect(parseAmount('1,234.56')).toBe(1.234); // Only first separator is replaced
    });
  });

  describe('formatAmount', () => {
    it('should format BRL currency', () => {
      const formatted = formatAmount(100, 'BRL');
      expect(formatted).toContain('R$');
      expect(formatted).toContain('100');
    });

    it('should format decimal amounts with comma', () => {
      const formatted = formatAmount(123.45, 'BRL');
      expect(formatted).toContain('123,45');
    });

    it('should default to BRL when currency not specified', () => {
      const formatted = formatAmount(50);
      expect(formatted).toContain('R$');
    });

    it('should handle zero amount', () => {
      const formatted = formatAmount(0, 'BRL');
      expect(formatted).toContain('0');
    });

    it('should handle negative amounts', () => {
      const formatted = formatAmount(-50, 'BRL');
      expect(formatted).toContain('-');
    });
  });

  describe('formatAmountInput', () => {
    it('should format number to string with comma', () => {
      expect(formatAmountInput(123.45)).toBe('123,45');
    });

    it('should include two decimal places', () => {
      expect(formatAmountInput(100)).toBe('100,00');
    });

    it('should handle small decimals', () => {
      expect(formatAmountInput(0.99)).toBe('0,99');
    });
  });

  describe('calculateEqualSplits', () => {
    it('should divide equally among two members', () => {
      const splits = calculateEqualSplits(100, ['user-1', 'user-2']);

      expect(splits).toHaveLength(2);
      expect(splits[0].amount).toBe(50);
      expect(splits[1].amount).toBe(50);
      expect(splits[0].percentage).toBe(50);
      expect(splits[1].percentage).toBe(50);
    });

    it('should divide equally among three members', () => {
      const splits = calculateEqualSplits(100, ['user-1', 'user-2', 'user-3']);

      expect(splits).toHaveLength(3);

      // First member gets the remainder
      expect(splits[0].amount).toBeCloseTo(33.34, 2);
      expect(splits[1].amount).toBeCloseTo(33.33, 2);
      expect(splits[2].amount).toBeCloseTo(33.33, 2);

      // Sum should equal total
      const sum = splits.reduce((acc, split) => acc + split.amount, 0);
      expect(sum).toBeCloseTo(100, 2);
    });

    it('should handle amounts that do not divide evenly', () => {
      const splits = calculateEqualSplits(50, ['user-1', 'user-2', 'user-3']);

      // First member gets the remainder
      expect(splits[0].amount).toBeCloseTo(16.68, 2);
      expect(splits[1].amount).toBeCloseTo(16.66, 2);
      expect(splits[2].amount).toBeCloseTo(16.66, 2);

      const sum = splits.reduce((acc, split) => acc + split.amount, 0);
      expect(sum).toBeCloseTo(50, 2);
    });

    it('should assign 100% to single member', () => {
      const splits = calculateEqualSplits(100, ['user-1']);

      expect(splits).toHaveLength(1);
      expect(splits[0].amount).toBe(100);
      expect(splits[0].percentage).toBe(100);
    });

    it('should return empty array for empty member list', () => {
      const splits = calculateEqualSplits(100, []);

      expect(splits).toHaveLength(0);
    });

    it('should handle zero amount', () => {
      const splits = calculateEqualSplits(0, ['user-1', 'user-2']);

      expect(splits).toHaveLength(2);
      expect(splits[0].amount).toBe(0);
      expect(splits[1].amount).toBe(0);
    });

    it('should assign correct user IDs', () => {
      const memberIds = ['user-1', 'user-2', 'user-3'];
      const splits = calculateEqualSplits(100, memberIds);

      expect(splits[0].user_id).toBe('user-1');
      expect(splits[1].user_id).toBe('user-2');
      expect(splits[2].user_id).toBe('user-3');
    });
  });

  describe('calculateAmountSplits', () => {
    it('should calculate splits from custom amounts', () => {
      const customAmounts = {
        'user-1': '60',
        'user-2': '40',
      };
      const splits = calculateAmountSplits(100, customAmounts, ['user-1', 'user-2']);

      expect(splits).toHaveLength(2);
      expect(splits[0].amount).toBe(60);
      expect(splits[0].percentage).toBe(60);
      expect(splits[1].amount).toBe(40);
      expect(splits[1].percentage).toBe(40);
    });

    it('should handle comma as decimal separator', () => {
      const customAmounts = {
        'user-1': '33,33',
        'user-2': '66,67',
      };
      const splits = calculateAmountSplits(100, customAmounts, ['user-1', 'user-2']);

      expect(splits[0].amount).toBeCloseTo(33.33, 2);
      expect(splits[1].amount).toBeCloseTo(66.67, 2);
    });

    it('should default to 0 for missing members', () => {
      const customAmounts = {
        'user-1': '100',
      };
      const splits = calculateAmountSplits(100, customAmounts, ['user-1', 'user-2']);

      expect(splits[1].amount).toBe(0);
      expect(splits[1].percentage).toBe(0);
    });

    it('should calculate correct percentages', () => {
      const customAmounts = {
        'user-1': '25',
        'user-2': '75',
      };
      const splits = calculateAmountSplits(100, customAmounts, ['user-1', 'user-2']);

      expect(splits[0].percentage).toBe(25);
      expect(splits[1].percentage).toBe(75);
    });

    it('should handle zero total amount', () => {
      const customAmounts = {
        'user-1': '50',
        'user-2': '50',
      };
      const splits = calculateAmountSplits(0, customAmounts, ['user-1', 'user-2']);

      expect(splits[0].percentage).toBe(0);
      expect(splits[1].percentage).toBe(0);
    });

    it('should handle unequal splits', () => {
      const customAmounts = {
        'user-1': '70',
        'user-2': '20',
        'user-3': '10',
      };
      const splits = calculateAmountSplits(100, customAmounts, ['user-1', 'user-2', 'user-3']);

      expect(splits[0].amount).toBe(70);
      expect(splits[1].amount).toBe(20);
      expect(splits[2].amount).toBe(10);
    });
  });

  describe('calculatePercentageSplits', () => {
    it('should calculate amounts from percentages', () => {
      const customPercentages = {
        'user-1': '60',
        'user-2': '40',
      };
      const splits = calculatePercentageSplits(100, customPercentages, ['user-1', 'user-2']);

      expect(splits).toHaveLength(2);
      expect(splits[0].amount).toBe(60);
      expect(splits[0].percentage).toBe(60);
      expect(splits[1].amount).toBe(40);
      expect(splits[1].percentage).toBe(40);
    });

    it('should handle decimal percentages', () => {
      const customPercentages = {
        'user-1': '33.33',
        'user-2': '66.67',
      };
      const splits = calculatePercentageSplits(100, customPercentages, ['user-1', 'user-2']);

      expect(splits[0].amount).toBeCloseTo(33.33, 2);
      expect(splits[1].amount).toBeCloseTo(66.67, 2);
    });

    it('should handle comma as decimal separator', () => {
      const customPercentages = {
        'user-1': '33,33',
        'user-2': '66,67',
      };
      const splits = calculatePercentageSplits(100, customPercentages, ['user-1', 'user-2']);

      expect(splits[0].amount).toBeCloseTo(33.33, 2);
      expect(splits[1].amount).toBeCloseTo(66.67, 2);
    });

    it('should round amounts to 2 decimal places', () => {
      const customPercentages = {
        'user-1': '33.333',
        'user-2': '66.667',
      };
      const splits = calculatePercentageSplits(100, customPercentages, ['user-1', 'user-2']);

      expect(splits[0].amount).toBe(33.33);
      expect(splits[1].amount).toBe(66.67);
    });

    it('should default to 0 for missing members', () => {
      const customPercentages = {
        'user-1': '100',
      };
      const splits = calculatePercentageSplits(100, customPercentages, ['user-1', 'user-2']);

      expect(splits[1].amount).toBe(0);
      expect(splits[1].percentage).toBe(0);
    });

    it('should handle unequal percentages', () => {
      const customPercentages = {
        'user-1': '50',
        'user-2': '30',
        'user-3': '20',
      };
      const splits = calculatePercentageSplits(100, customPercentages, [
        'user-1',
        'user-2',
        'user-3',
      ]);

      expect(splits[0].amount).toBe(50);
      expect(splits[1].amount).toBe(30);
      expect(splits[2].amount).toBe(20);
    });

    it('should work with different total amounts', () => {
      const customPercentages = {
        'user-1': '60',
        'user-2': '40',
      };
      const splits = calculatePercentageSplits(250, customPercentages, ['user-1', 'user-2']);

      expect(splits[0].amount).toBe(150);
      expect(splits[1].amount).toBe(100);
    });
  });

  describe('validateSplitsTotal', () => {
    it('should return valid when splits sum equals total', () => {
      const splits = [
        { user_id: 'user-1', amount: 50, percentage: null },
        { user_id: 'user-2', amount: 50, percentage: null },
      ];

      const result = validateSplitsTotal(splits, 100);

      expect(result.valid).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should return invalid when splits sum does not equal total', () => {
      const splits = [
        { user_id: 'user-1', amount: 50, percentage: null },
        { user_id: 'user-2', amount: 40, percentage: null },
      ];

      const result = validateSplitsTotal(splits, 100);

      expect(result.valid).toBe(false);
      expect(result.difference).toBe(10);
    });

    it('should allow small floating point differences within tolerance', () => {
      const splits = [
        { user_id: 'user-1', amount: 33.34, percentage: null },
        { user_id: 'user-2', amount: 33.33, percentage: null },
        { user_id: 'user-3', amount: 33.33, percentage: null },
      ];

      const result = validateSplitsTotal(splits, 100);

      expect(result.valid).toBe(true);
    });

    it('should reject differences larger than tolerance', () => {
      const splits = [
        { user_id: 'user-1', amount: 50, percentage: null },
        { user_id: 'user-2', amount: 40, percentage: null },
      ];

      const result = validateSplitsTotal(splits, 100, 0.01);

      expect(result.valid).toBe(false);
    });

    it('should handle custom tolerance', () => {
      const splits = [
        { user_id: 'user-1', amount: 50, percentage: null },
        { user_id: 'user-2', amount: 49, percentage: null },
      ];

      const strictResult = validateSplitsTotal(splits, 100, 0.01);
      expect(strictResult.valid).toBe(false);

      const lenientResult = validateSplitsTotal(splits, 100, 1);
      expect(lenientResult.valid).toBe(true);
    });

    it('should return correct difference', () => {
      const splits = [
        { user_id: 'user-1', amount: 60, percentage: null },
        { user_id: 'user-2', amount: 30, percentage: null },
      ];

      const result = validateSplitsTotal(splits, 100);

      expect(result.difference).toBe(10);
    });
  });

  describe('validatePercentagesTotal', () => {
    it('should return valid when percentages sum to 100', () => {
      const percentages = {
        'user-1': '60',
        'user-2': '40',
      };

      const result = validatePercentagesTotal(percentages, ['user-1', 'user-2']);

      expect(result.valid).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should return invalid when percentages do not sum to 100', () => {
      const percentages = {
        'user-1': '60',
        'user-2': '30',
      };

      const result = validatePercentagesTotal(percentages, ['user-1', 'user-2']);

      expect(result.valid).toBe(false);
      expect(result.difference).toBe(10);
    });

    it('should allow small floating point differences within tolerance', () => {
      const percentages = {
        'user-1': '33.34',
        'user-2': '33.33',
        'user-3': '33.33',
      };

      const result = validatePercentagesTotal(percentages, ['user-1', 'user-2', 'user-3']);

      expect(result.valid).toBe(true);
    });

    it('should handle custom tolerance', () => {
      const percentages = {
        'user-1': '50',
        'user-2': '49',
      };

      const strictResult = validatePercentagesTotal(percentages, ['user-1', 'user-2'], 0.01);
      expect(strictResult.valid).toBe(false);

      const lenientResult = validatePercentagesTotal(percentages, ['user-1', 'user-2'], 1);
      expect(lenientResult.valid).toBe(true);
    });

    it('should return correct difference', () => {
      const percentages = {
        'user-1': '70',
        'user-2': '20',
      };

      const result = validatePercentagesTotal(percentages, ['user-1', 'user-2']);

      expect(result.difference).toBe(10);
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with one decimal place', () => {
      expect(formatPercentage(33.333)).toBe('33,3%');
    });

    it('should use comma as decimal separator', () => {
      expect(formatPercentage(50.5)).toBe('50,5%');
    });

    it('should handle integer percentages', () => {
      expect(formatPercentage(100)).toBe('100,0%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0,0%');
    });
  });
});
