import { z } from 'zod';
import type { ExpenseCategory } from '@/types/database';

export const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: 'accommodation', label: 'Hospedagem' },
  { value: 'food', label: 'Alimentação' },
  { value: 'transport', label: 'Transporte' },
  { value: 'tickets', label: 'Ingressos' },
  { value: 'shopping', label: 'Compras' },
  { value: 'other', label: 'Outros' },
];

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
  amount: z
    .number({ required_error: 'Valor é obrigatório' })
    .positive('Valor deve ser maior que zero'),
  currency: z.string().length(3, 'Moeda deve ter 3 caracteres').default('BRL'),
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
  currency: z.string().length(3, 'Moeda deve ter 3 caracteres').default('BRL'),
  date: z.string().min(1, 'Data é obrigatória'),
  category: z.enum(
    ['accommodation', 'food', 'transport', 'tickets', 'shopping', 'other'] as const,
    {
      message: 'Categoria inválida',
    }
  ),
  paid_by: z.string().min(1, 'Quem pagou é obrigatório'),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
  split_type: z.enum(['equal', 'custom'] as const).default('equal'),
  selected_members: z.array(z.string()).min(1, 'Selecione pelo menos um participante'),
  custom_splits: z.record(z.string(), z.string()).optional(),
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
