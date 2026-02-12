import { z } from 'zod';
import type { ExpenseCategory } from '@/types/database';
import { SUPPORTED_CURRENCIES } from '@/types/currency';

export const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: 'accommodation', label: 'Hospedagem' },
  { value: 'food', label: 'Alimentação' },
  { value: 'transport', label: 'Transporte' },
  { value: 'tickets', label: 'Ingressos' },
  { value: 'shopping', label: 'Compras' },
  { value: 'other', label: 'Outros' },
];

// Split types available for expense division
export const splitTypes = [
  { value: 'equal', label: 'Igualmente', description: 'Dividir igualmente entre os selecionados' },
  { value: 'by_amount', label: 'Por valor', description: 'Definir valor específico para cada um' },
  {
    value: 'by_percentage',
    label: 'Por percentual',
    description: 'Definir percentual para cada um',
  },
] as const;

export type SplitType = (typeof splitTypes)[number]['value'];

export const expenseSplitSchema = z.object({
  user_id: z.string().uuid('ID do usuário inválido'),
  amount: z.number().nonnegative('Valor deve ser positivo ou zero'),
  percentage: z.number().min(0).max(100).optional().nullable(),
});

export type ExpenseSplitInput = z.infer<typeof expenseSplitSchema>;

export const createExpenseSchema = z.object({
  trip_id: z.string().uuid('ID da viagem inválido'),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .min(2, 'Descrição deve ter pelo menos 2 caracteres')
    .max(200, 'Descrição deve ter no máximo 200 caracteres'),
  amount: z.number({ message: 'Valor é obrigatório' }).positive('Valor deve ser maior que zero'),
  currency: z.enum(SUPPORTED_CURRENCIES, { message: 'Moeda inválida' }).default('BRL'),
  exchange_rate: z.number().positive('Taxa de câmbio deve ser maior que zero').default(1),
  date: z.string().min(1, 'Data é obrigatória'),
  category: z
    .enum(['accommodation', 'food', 'transport', 'tickets', 'shopping', 'other'] as const, {
      message: 'Categoria inválida',
    })
    .refine((val) => val !== undefined, { message: 'Categoria é obrigatória' }),
  paid_by: z.string().uuid('Quem pagou é obrigatório'),
  notes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable(),
  splits: z
    .array(expenseSplitSchema)
    .min(1, 'Pelo menos um participante deve ser incluído na divisão'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.omit({ trip_id: true }).partial();

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// Form schema (uses string for amount to handle input)
export const expenseFormSchema = z.object({
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .min(2, 'Descrição deve ter pelo menos 2 caracteres')
    .max(200, 'Descrição deve ter no máximo 200 caracteres'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  currency: z.enum(SUPPORTED_CURRENCIES, { message: 'Moeda inválida' }),
  exchange_rate: z.string().optional(),
  date: z.string().min(1, 'Data é obrigatória'),
  category: z.enum(
    ['accommodation', 'food', 'transport', 'tickets', 'shopping', 'other'] as const,
    {
      message: 'Categoria inválida',
    }
  ),
  paid_by: z.string().min(1, 'Quem pagou é obrigatório'),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
  split_type: z.enum(['equal', 'by_amount', 'by_percentage'] as const),
  selected_members: z.array(z.string()).min(1, 'Selecione pelo menos um participante'),
  // For by_amount: record of user_id -> amount string
  custom_amounts: z.record(z.string(), z.string()).optional(),
  // For by_percentage: record of user_id -> percentage string
  custom_percentages: z.record(z.string(), z.string()).optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/**
 * Parse amount string to number (handles comma as decimal separator)
 */
export function parseAmount(value: string): number {
  // Replace comma with dot for parsing
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format amount number to display string
 */
export function formatAmount(value: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format amount number to input string (no currency symbol)
 */
export function formatAmountInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/**
 * Format a raw input string as currency (auto-insert comma).
 * Strips non-digits, treats as centavos, returns formatted string.
 * "95" → "0,95", "9500" → "95,00", "15000" → "150,00"
 */
export function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const centavos = parseInt(digits, 10);
  const formatted = (centavos / 100).toFixed(2).replace('.', ',');
  return formatted;
}

/**
 * Calculate equal splits for selected members
 * Handles rounding by assigning the remainder to the first member
 */
export function calculateEqualSplits(
  totalAmount: number,
  memberIds: string[]
): ExpenseSplitInput[] {
  if (memberIds.length === 0) return [];

  const baseAmount = Math.floor((totalAmount / memberIds.length) * 100) / 100;
  const remainder = Math.round((totalAmount - baseAmount * memberIds.length) * 100) / 100;

  return memberIds.map((userId, index) => ({
    user_id: userId,
    amount: index === 0 ? baseAmount + remainder : baseAmount,
    percentage: Math.round((100 / memberIds.length) * 100) / 100,
  }));
}

/**
 * Calculate splits by custom amounts
 */
export function calculateAmountSplits(
  totalAmount: number,
  customAmounts: Record<string, string>,
  memberIds: string[]
): ExpenseSplitInput[] {
  return memberIds.map((userId) => {
    const amount = parseAmount(customAmounts[userId] || '0');
    const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
    return {
      user_id: userId,
      amount,
      percentage: Math.round(percentage * 100) / 100,
    };
  });
}

/**
 * Calculate splits by percentage
 */
export function calculatePercentageSplits(
  totalAmount: number,
  customPercentages: Record<string, string>,
  memberIds: string[]
): ExpenseSplitInput[] {
  return memberIds.map((userId) => {
    const percentage = parseAmount(customPercentages[userId] || '0');
    const amount = Math.round(((totalAmount * percentage) / 100) * 100) / 100;
    return {
      user_id: userId,
      amount,
      percentage,
    };
  });
}

/**
 * Validate that splits sum to total amount (within tolerance)
 */
export function validateSplitsTotal(
  splits: ExpenseSplitInput[],
  totalAmount: number,
  tolerance: number = 0.01
): { valid: boolean; difference: number } {
  const splitsSum = splits.reduce((sum, split) => sum + split.amount, 0);
  const difference = Math.abs(splitsSum - totalAmount);
  return {
    valid: difference <= tolerance,
    difference: Math.round((totalAmount - splitsSum) * 100) / 100,
  };
}

/**
 * Validate that percentages sum to 100 (within tolerance)
 */
export function validatePercentagesTotal(
  percentages: Record<string, string>,
  memberIds: string[],
  tolerance: number = 0.01
): { valid: boolean; difference: number } {
  const total = memberIds.reduce((sum, id) => sum + parseAmount(percentages[id] || '0'), 0);
  return {
    valid: Math.abs(total - 100) <= tolerance,
    difference: Math.round((100 - total) * 100) / 100,
  };
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}
