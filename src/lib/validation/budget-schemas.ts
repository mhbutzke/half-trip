import { z } from 'zod';

export const budgetCategories = [
  'total',
  'accommodation',
  'food',
  'transport',
  'tickets',
  'shopping',
  'other',
] as const;

export type BudgetCategoryValue = (typeof budgetCategories)[number];

export const budgetCategoryLabels: Record<BudgetCategoryValue, string> = {
  total: 'Total da viagem',
  accommodation: 'Hospedagem',
  food: 'Alimentação',
  transport: 'Transporte',
  tickets: 'Ingressos',
  shopping: 'Compras',
  other: 'Outros',
};

export const createBudgetSchema = z.object({
  trip_id: z.string().uuid('ID da viagem inválido'),
  category: z.enum(budgetCategories, { message: 'Categoria inválida' }),
  amount: z.number().positive('Valor deve ser maior que zero'),
  currency: z.string().length(3, 'Moeda deve ter 3 caracteres').default('BRL'),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z.object({
  amount: z.number().positive('Valor deve ser maior que zero'),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const budgetFormSchema = z.object({
  category: z.enum(budgetCategories, { message: 'Categoria inválida' }),
  amount: z.string().min(1, 'Valor é obrigatório'),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;
