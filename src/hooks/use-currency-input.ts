'use client';

import { useState, useCallback, useRef, type ChangeEvent } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBRL(currency: string): boolean {
  return currency.toUpperCase() === 'BRL';
}

/** Decimal separator for the given currency locale */
function decimalSeparator(currency: string): string {
  return isBRL(currency) ? ',' : '.';
}

/** Thousands separator for the given currency locale */
function thousandsSeparator(currency: string): string {
  return isBRL(currency) ? '.' : ',';
}

/**
 * Format a numeric value as a display string with 2 decimal places,
 * using the appropriate locale separators.
 */
function formatValue(value: number, currency: string): string {
  if (value === 0) return '';

  const fixed = Math.abs(value).toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  // Add thousands separators
  const tSep = thousandsSeparator(currency);
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, tSep);

  const dSep = decimalSeparator(currency);
  const sign = value < 0 ? '-' : '';
  return `${sign}${withThousands}${dSep}${decPart}`;
}

/**
 * Parse a display string back to a numeric value.
 * Strips everything except digits and the decimal separator.
 */
function parseDisplayValue(display: string, currency: string): number {
  if (!display) return 0;

  const tSep = thousandsSeparator(currency);
  const dSep = decimalSeparator(currency);

  // Remove thousands separators
  let cleaned = display.split(tSep).join('');

  // Replace locale decimal separator with '.' for parseFloat
  cleaned = cleaned.replace(dSep, '.');

  // Strip anything that isn't a digit, dot, or minus sign
  cleaned = cleaned.replace(/[^\d.\-]/g, '');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Strip everything except digits and the locale-specific decimal separator
 * (used while the user is typing).
 */
function sanitizeInput(input: string, currency: string): string {
  const dSep = decimalSeparator(currency);

  let result = '';
  let hasDecimal = false;
  let decimalDigits = 0;

  for (const char of input) {
    if (char >= '0' && char <= '9') {
      // After a decimal separator, allow at most 2 digits
      if (hasDecimal) {
        if (decimalDigits < 2) {
          result += char;
          decimalDigits++;
        }
      } else {
        result += char;
      }
    } else if (char === dSep && !hasDecimal) {
      result += char;
      hasDecimal = true;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Legacy exports (kept for backward compatibility with existing consumers)
// ---------------------------------------------------------------------------

export function formatCurrencyWithCursor(raw: string): { value: string; cursor: number } {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { value: '', cursor: 0 };

  const centavos = parseInt(digits, 10);
  const reais = centavos / 100;
  const formatted = reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return { value: formatted, cursor: formatted.length };
}

interface UseCurrencyInputLegacyOptions {
  value?: string;
  onChange: (value: string) => void;
}

/**
 * Legacy currency input hook — BRL only, formats as centavos.
 * For multi-currency support, use `useCurrencyInputMulti` instead.
 */
export function useCurrencyInput({ value, onChange }: UseCurrencyInputLegacyOptions) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const { value: formatted, cursor } = formatCurrencyWithCursor(raw);
      onChange(formatted);

      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(cursor, cursor);
      });
    },
    [onChange]
  );

  return {
    ref: inputRef,
    value: value ?? '',
    onChange: handleChange,
    inputMode: 'numeric' as const,
    placeholder: '0,00',
  };
}

// ---------------------------------------------------------------------------
// New multi-currency hook
// ---------------------------------------------------------------------------

interface UseCurrencyInputParams {
  /** ISO 4217 currency code (e.g. 'BRL', 'USD', 'EUR') */
  currency: string;
  /** Initial numeric value */
  initialValue?: number;
  /** Called with the raw numeric value whenever the input changes */
  onChange?: (value: number) => void;
}

interface UseCurrencyInputReturn {
  /** Formatted string currently displayed in the input */
  displayValue: string;
  /** Raw numeric value */
  rawValue: number;
  /** Change handler */
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Blur handler -- applies full formatting */
  handleBlur: () => void;
  /** Convenience object to spread onto an <input> element */
  inputProps: {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    inputMode: 'decimal';
    type: 'text';
  };
}

/**
 * Multi-currency input hook.
 * For BRL: comma decimal (100,50), period thousands (1.000,00)
 * For USD/EUR/etc: dot decimal (100.50), comma thousands (1,000.00)
 */
export function useCurrencyInputMulti({
  currency,
  initialValue = 0,
  onChange,
}: UseCurrencyInputParams): UseCurrencyInputReturn {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    initialValue ? formatValue(initialValue, currency) : ''
  );
  const [rawValue, setRawValue] = useState<number>(initialValue ?? 0);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeInput(e.target.value, currency);
      setDisplayValue(sanitized);

      const numeric = parseDisplayValue(sanitized, currency);
      setRawValue(numeric);
      onChange?.(numeric);
    },
    [currency, onChange]
  );

  const handleBlur = useCallback(() => {
    // On blur, fully format the current raw value
    const formatted = rawValue ? formatValue(rawValue, currency) : '';
    setDisplayValue(formatted);
  }, [rawValue, currency]);

  return {
    displayValue,
    rawValue,
    handleChange,
    handleBlur,
    inputProps: {
      value: displayValue,
      onChange: handleChange,
      onBlur: handleBlur,
      inputMode: 'decimal' as const,
      type: 'text' as const,
    },
  };
}
