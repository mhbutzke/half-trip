import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { formatCurrencyWithCursor, useCurrencyInputMulti } from './use-currency-input';
import type { ChangeEvent } from 'react';

// ---------------------------------------------------------------------------
// Legacy: formatCurrencyWithCursor
// ---------------------------------------------------------------------------

describe('formatCurrencyWithCursor', () => {
  it('formats digits as centavos', () => {
    expect(formatCurrencyWithCursor('123')).toEqual({ value: '1,23', cursor: 4 });
  });

  it('handles single digit', () => {
    expect(formatCurrencyWithCursor('5')).toEqual({ value: '0,05', cursor: 4 });
  });

  it('handles two digits', () => {
    expect(formatCurrencyWithCursor('50')).toEqual({ value: '0,50', cursor: 4 });
  });

  it('handles empty string', () => {
    expect(formatCurrencyWithCursor('')).toEqual({ value: '', cursor: 0 });
  });

  it('strips non-digit characters', () => {
    expect(formatCurrencyWithCursor('1a2b3')).toEqual({ value: '1,23', cursor: 4 });
  });

  it('handles large amounts with thousands separator', () => {
    expect(formatCurrencyWithCursor('1500000')).toEqual({ value: '15.000,00', cursor: 9 });
  });
});

// ---------------------------------------------------------------------------
// New multi-currency hook: useCurrencyInput
// ---------------------------------------------------------------------------

/** Helper to create a fake ChangeEvent */
function fakeChangeEvent(value: string): ChangeEvent<HTMLInputElement> {
  return { target: { value } } as ChangeEvent<HTMLInputElement>;
}

describe('useCurrencyInput (multi-currency)', () => {
  describe('initial value formatting', () => {
    it('formats BRL initial value with comma decimal separator', () => {
      const { result } = renderHook(() =>
        useCurrencyInputMulti({ currency: 'BRL', initialValue: 100.5 })
      );

      expect(result.current.displayValue).toBe('100,50');
      expect(result.current.rawValue).toBe(100.5);
    });

    it('formats USD initial value with dot decimal separator', () => {
      const { result } = renderHook(() =>
        useCurrencyInputMulti({ currency: 'USD', initialValue: 100.5 })
      );

      expect(result.current.displayValue).toBe('100.50');
      expect(result.current.rawValue).toBe(100.5);
    });

    it('formats large BRL value with period thousands separator', () => {
      const { result } = renderHook(() =>
        useCurrencyInputMulti({ currency: 'BRL', initialValue: 1234.56 })
      );

      expect(result.current.displayValue).toBe('1.234,56');
      expect(result.current.rawValue).toBe(1234.56);
    });

    it('formats large USD value with comma thousands separator', () => {
      const { result } = renderHook(() =>
        useCurrencyInputMulti({ currency: 'USD', initialValue: 1234.56 })
      );

      expect(result.current.displayValue).toBe('1,234.56');
      expect(result.current.rawValue).toBe(1234.56);
    });

    it('defaults to empty display and 0 raw value when no initialValue', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL' }));

      expect(result.current.displayValue).toBe('');
      expect(result.current.rawValue).toBe(0);
    });
  });

  describe('stripping non-numeric characters', () => {
    it('strips letters and symbols from BRL input', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('1a2b3,4c5'));
      });

      expect(result.current.displayValue).toBe('123,45');
      expect(result.current.rawValue).toBe(123.45);
    });

    it('strips letters and symbols from USD input', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'USD' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('$1,000.50abc'));
      });

      // sanitizeInput keeps digits and the dot decimal separator for USD
      expect(result.current.displayValue).toBe('1000.50');
      expect(result.current.rawValue).toBe(1000.5);
    });
  });

  describe('rawValue as number', () => {
    it('returns correct rawValue for BRL input', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL', onChange }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('250,75'));
      });

      expect(result.current.rawValue).toBe(250.75);
      expect(onChange).toHaveBeenCalledWith(250.75);
    });

    it('returns correct rawValue for USD input', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'USD', onChange }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('250.75'));
      });

      expect(result.current.rawValue).toBe(250.75);
      expect(onChange).toHaveBeenCalledWith(250.75);
    });
  });

  describe('empty input handling', () => {
    it('returns 0 for empty BRL input', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useCurrencyInputMulti({ currency: 'BRL', initialValue: 50, onChange })
      );

      act(() => {
        result.current.handleChange(fakeChangeEvent(''));
      });

      expect(result.current.rawValue).toBe(0);
      expect(result.current.displayValue).toBe('');
      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('returns 0 for empty USD input', () => {
      const { result } = renderHook(() =>
        useCurrencyInputMulti({ currency: 'USD', initialValue: 50 })
      );

      act(() => {
        result.current.handleChange(fakeChangeEvent(''));
      });

      expect(result.current.rawValue).toBe(0);
      expect(result.current.displayValue).toBe('');
    });
  });

  describe('BRL uses comma decimal separator', () => {
    it('allows comma as decimal separator', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('99,99'));
      });

      expect(result.current.displayValue).toBe('99,99');
      expect(result.current.rawValue).toBe(99.99);
    });

    it('does not allow dot as decimal separator for BRL', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('99.99'));
      });

      // dot is stripped for BRL since comma is the decimal separator
      expect(result.current.displayValue).toBe('9999');
      expect(result.current.rawValue).toBe(9999);
    });

    it('formats with period thousands separator on blur', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('15000'));
      });

      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.displayValue).toBe('15.000,00');
    });
  });

  describe('USD uses dot decimal separator', () => {
    it('allows dot as decimal separator', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'USD' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('99.99'));
      });

      expect(result.current.displayValue).toBe('99.99');
      expect(result.current.rawValue).toBe(99.99);
    });

    it('does not allow comma as decimal separator for USD', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'USD' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('99,99'));
      });

      // comma is stripped for USD since dot is the decimal separator
      expect(result.current.displayValue).toBe('9999');
      expect(result.current.rawValue).toBe(9999);
    });

    it('formats with comma thousands separator on blur', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'USD' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('15000'));
      });

      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.displayValue).toBe('15,000.00');
    });
  });

  describe('inputProps', () => {
    it('returns correct inputProps shape', () => {
      const { result } = renderHook(() =>
        useCurrencyInputMulti({ currency: 'BRL', initialValue: 42 })
      );

      const { inputProps } = result.current;

      expect(inputProps.type).toBe('text');
      expect(inputProps.inputMode).toBe('decimal');
      expect(inputProps.value).toBe('42,00');
      expect(typeof inputProps.onChange).toBe('function');
      expect(typeof inputProps.onBlur).toBe('function');
    });
  });

  describe('decimal precision', () => {
    it('limits to 2 decimal places while typing (BRL)', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('10,999'));
      });

      expect(result.current.displayValue).toBe('10,99');
    });

    it('limits to 2 decimal places while typing (USD)', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'USD' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('10.999'));
      });

      expect(result.current.displayValue).toBe('10.99');
    });

    it('prevents multiple decimal separators', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('10,50,30'));
      });

      // second comma is stripped
      expect(result.current.displayValue).toBe('10,50');
    });
  });

  describe('blur formatting', () => {
    it('formats value with full formatting on blur for BRL', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL' }));

      act(() => {
        result.current.handleChange(fakeChangeEvent('1500'));
      });

      expect(result.current.displayValue).toBe('1500');

      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.displayValue).toBe('1.500,00');
    });

    it('leaves display empty on blur when value is 0', () => {
      const { result } = renderHook(() => useCurrencyInputMulti({ currency: 'BRL' }));

      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.displayValue).toBe('');
    });
  });
});
