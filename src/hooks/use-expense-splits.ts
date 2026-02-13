'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  parseAmount,
  formatAmount,
  calculateEqualSplits,
  calculateAmountSplits,
  calculatePercentageSplits,
  validateSplitsTotal,
  validatePercentagesTotal,
} from '@/lib/validation/expense-schemas';
import type { ExpenseFormValues } from '@/lib/validation/expense-schemas';
import type { ExpenseSplitInput } from '@/lib/validation/expense-schemas';

type SplitType = 'equal' | 'by_amount' | 'by_percentage';

interface SplitResult {
  splits: ExpenseSplitInput[];
  amount: number;
  exchangeRate: number;
}

export function useExpenseSplits(baseCurrency: string) {
  const calculateSplits = useCallback(
    (data: ExpenseFormValues): SplitResult | null => {
      const amount = parseAmount(data.amount);
      if (amount <= 0) {
        toast.error('Valor deve ser maior que zero');
        return null;
      }

      const exchangeRate = data.exchange_rate ? parseAmount(data.exchange_rate) : 1;
      if (data.currency !== baseCurrency && exchangeRate <= 0) {
        toast.error('Taxa de câmbio deve ser maior que zero');
        return null;
      }

      const splitType = data.split_type as SplitType;
      let splits: ExpenseSplitInput[];

      if (splitType === 'equal') {
        splits = calculateEqualSplits(amount, data.selected_members);
      } else if (splitType === 'by_amount') {
        splits = calculateAmountSplits(amount, data.custom_amounts || {}, data.selected_members);
        const validation = validateSplitsTotal(splits, amount);
        if (!validation.valid) {
          toast.error(
            `A soma das divisões difere do total em ${formatAmount(Math.abs(validation.difference), data.currency)}`
          );
          return null;
        }
      } else {
        splits = calculatePercentageSplits(
          amount,
          data.custom_percentages || {},
          data.selected_members
        );
        const validation = validatePercentagesTotal(
          data.custom_percentages || {},
          data.selected_members
        );
        if (!validation.valid) {
          toast.error(
            `A soma dos percentuais difere de 100% em ${validation.difference.toFixed(1)}%`
          );
          return null;
        }
      }

      return { splits, amount, exchangeRate };
    },
    [baseCurrency]
  );

  return { calculateSplits };
}
