'use client';

import { useCallback, useRef } from 'react';

export function formatCurrencyWithCursor(
  raw: string,
  _cursorPos: number
): { value: string; cursor: number } {
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

interface UseCurrencyInputOptions {
  value: string;
  onChange: (value: string) => void;
}

export function useCurrencyInput({ value, onChange }: UseCurrencyInputOptions) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      const { value: formatted, cursor } = formatCurrencyWithCursor(raw, cursorPos);
      onChange(formatted);

      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(cursor, cursor);
      });
    },
    [onChange]
  );

  return {
    ref: inputRef,
    value,
    onChange: handleChange,
    inputMode: 'numeric' as const,
    placeholder: '0,00',
  };
}
