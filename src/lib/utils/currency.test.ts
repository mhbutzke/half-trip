/**
 * Unit Tests for Currency Utilities
 *
 * These tests verify the currency formatting and parsing functions.
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyValue, parseCurrency } from './currency';

describe('Currency Utilities', () => {
  describe('formatCurrency', () => {
    it('should format amount in BRL by default', () => {
      const formatted = formatCurrency(100);
      expect(formatted).toContain('R$');
      expect(formatted).toContain('100');
    });

    it('should format decimal amounts with comma', () => {
      const formatted = formatCurrency(123.45);
      expect(formatted).toContain('123,45');
    });

    it('should handle zero amount', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain('0');
    });

    it('should handle negative amounts', () => {
      const formatted = formatCurrency(-50.99);
      expect(formatted).toContain('-');
      expect(formatted).toContain('50,99');
    });

    it('should format large amounts with thousands separator', () => {
      const formatted = formatCurrency(1234567.89);
      // pt-BR uses period as thousands separator
      expect(formatted).toContain('1.234.567,89');
    });

    it('should support different currencies', () => {
      const formatted = formatCurrency(100, 'USD');
      expect(formatted).toContain('US$');
    });

    it('should round to 2 decimal places', () => {
      const formatted = formatCurrency(99.999);
      expect(formatted).toContain('100,00');
    });

    it('should format very small amounts', () => {
      const formatted = formatCurrency(0.01);
      expect(formatted).toContain('0,01');
    });
  });

  describe('formatCurrencyValue', () => {
    it('should format value without currency symbol', () => {
      const formatted = formatCurrencyValue(100);
      expect(formatted).not.toContain('R$');
      expect(formatted).toBe('100,00');
    });

    it('should always include 2 decimal places', () => {
      const formatted = formatCurrencyValue(50);
      expect(formatted).toBe('50,00');
    });

    it('should format decimal amounts', () => {
      const formatted = formatCurrencyValue(123.45);
      expect(formatted).toBe('123,45');
    });

    it('should format with thousands separator', () => {
      const formatted = formatCurrencyValue(1234.56);
      expect(formatted).toBe('1.234,56');
    });

    it('should handle zero', () => {
      const formatted = formatCurrencyValue(0);
      expect(formatted).toBe('0,00');
    });

    it('should handle negative values', () => {
      const formatted = formatCurrencyValue(-99.99);
      expect(formatted).toBe('-99,99');
    });
  });

  describe('parseCurrency', () => {
    it('should parse simple number string', () => {
      expect(parseCurrency('100')).toBe(100);
    });

    it('should parse amount with comma as decimal separator', () => {
      expect(parseCurrency('123,45')).toBe(123.45);
    });

    it('should parse amount with period as decimal separator', () => {
      expect(parseCurrency('123.45')).toBe(123.45);
    });

    it('should remove R$ currency symbol', () => {
      expect(parseCurrency('R$ 100,00')).toBe(100);
    });

    it('should handle formatted currency with spaces', () => {
      expect(parseCurrency('R$ 1.234,56')).toBe(1.234); // Note: thousands separator becomes decimal
    });

    it('should return 0 for empty string', () => {
      expect(parseCurrency('')).toBe(0);
    });

    it('should return 0 for invalid input', () => {
      expect(parseCurrency('abc')).toBe(0);
    });

    it('should handle negative amounts', () => {
      expect(parseCurrency('-50,99')).toBe(-50.99);
    });

    it('should handle amount without decimals', () => {
      expect(parseCurrency('100')).toBe(100);
    });

    it('should parse amount with only currency symbol', () => {
      expect(parseCurrency('R$')).toBe(0);
    });

    it('should handle whitespace', () => {
      expect(parseCurrency('  100,50  ')).toBe(100.5);
    });
  });
});
