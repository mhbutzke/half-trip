import { describe, it, expect } from 'vitest';
import { formatCurrencyWithCursor } from './use-currency-input';

describe('formatCurrencyWithCursor', () => {
  it('formats digits as centavos', () => {
    expect(formatCurrencyWithCursor('123', 3)).toEqual({ value: '1,23', cursor: 4 });
  });

  it('handles single digit', () => {
    expect(formatCurrencyWithCursor('5', 1)).toEqual({ value: '0,05', cursor: 4 });
  });

  it('handles two digits', () => {
    expect(formatCurrencyWithCursor('50', 2)).toEqual({ value: '0,50', cursor: 4 });
  });

  it('handles empty string', () => {
    expect(formatCurrencyWithCursor('', 0)).toEqual({ value: '', cursor: 0 });
  });

  it('strips non-digit characters', () => {
    expect(formatCurrencyWithCursor('1a2b3', 5)).toEqual({ value: '1,23', cursor: 4 });
  });

  it('handles large amounts with thousands separator', () => {
    expect(formatCurrencyWithCursor('1500000', 7)).toEqual({ value: '15.000,00', cursor: 9 });
  });
});
