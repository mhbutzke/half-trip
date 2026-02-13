'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrencyInput } from '@/hooks/use-currency-input';
import { SUPPORTED_CURRENCIES } from '@/types/currency';
import { formatAmount, parseAmount } from '@/lib/validation/expense-schemas';
import type { ExpenseFormValues } from '@/lib/validation/expense-schemas';

interface CurrencyAmountInputProps {
  form: UseFormReturn<ExpenseFormValues>;
  baseCurrency: string;
  /** 'compact' uses centered large input (dialog style), 'full' uses side-by-side (page style) */
  variant?: 'compact' | 'full';
}

export function CurrencyAmountInput({
  form,
  baseCurrency,
  variant = 'full',
}: CurrencyAmountInputProps) {
  const watchCurrency = form.watch('currency');
  const watchAmount = form.watch('amount');
  const exchangeRateValue = form.watch('exchange_rate');

  const isForeignCurrency = watchCurrency !== baseCurrency;
  const parsedAmount = parseAmount(watchAmount || '0');

  const amountInput = useCurrencyInput({
    value: watchAmount,
    onChange: (v) => form.setValue('amount', v),
  });

  const exchangeRateInput = useCurrencyInput({
    value: exchangeRateValue,
    onChange: (v) => form.setValue('exchange_rate', v),
  });

  if (variant === 'compact') {
    return (
      <>
        <FormField
          control={form.control}
          name="amount"
          render={() => (
            <FormItem>
              <FormControl>
                <Input
                  className="text-center text-3xl font-bold h-16 border-none shadow-none focus-visible:ring-0"
                  {...amountInput}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem className="flex justify-center">
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isForeignCurrency && (
          <FormField
            control={form.control}
            name="exchange_rate"
            render={() => (
              <FormItem>
                <FormLabel>Taxa de câmbio</FormLabel>
                <FormControl>
                  <Input {...exchangeRateInput} placeholder="Ex: 5,78" />
                </FormControl>
                <FormDescription>
                  1 {watchCurrency} = ? {baseCurrency}
                </FormDescription>
                {parsedAmount > 0 && exchangeRateValue && parseAmount(exchangeRateValue) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formatAmount(parsedAmount, watchCurrency)} ={' '}
                    {formatAmount(parsedAmount * parseAmount(exchangeRateValue), baseCurrency)}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </>
    );
  }

  // variant === 'full'
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="amount"
          render={() => (
            <FormItem className="col-span-2">
              <FormLabel>Valor</FormLabel>
              <FormControl>
                <Input {...amountInput} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Moeda</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {isForeignCurrency && (
        <FormField
          control={form.control}
          name="exchange_rate"
          render={() => (
            <FormItem>
              <FormLabel>Taxa de câmbio</FormLabel>
              <FormControl>
                <Input {...exchangeRateInput} placeholder="Ex: 5,78" />
              </FormControl>
              <FormDescription>
                1 {watchCurrency} = ? {baseCurrency}
              </FormDescription>
              {parsedAmount > 0 && exchangeRateValue && parseAmount(exchangeRateValue) > 0 && (
                <p className="text-sm text-muted-foreground">
                  {formatAmount(parsedAmount, watchCurrency)} ={' '}
                  {formatAmount(parsedAmount * parseAmount(exchangeRateValue), baseCurrency)}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
