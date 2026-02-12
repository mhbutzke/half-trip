import { z } from 'zod';
import type { TripStyle } from '@/types/database';
import { SUPPORTED_CURRENCIES } from '@/types/currency';

export const tripStyles: { value: TripStyle; label: string }[] = [
  { value: 'adventure', label: 'Aventura' },
  { value: 'relaxation', label: 'Relaxamento' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'gastronomic', label: 'Gastronômica' },
  { value: 'other', label: 'Outro' },
];

export const createTripSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nome da viagem é obrigatório')
      .min(2, 'Nome deve ter pelo menos 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
    destination: z
      .string()
      .min(1, 'Destino é obrigatório')
      .min(2, 'Destino deve ter pelo menos 2 caracteres')
      .max(200, 'Destino deve ter no máximo 200 caracteres'),
    start_date: z.string().min(1, 'Data de início é obrigatória'),
    end_date: z.string().min(1, 'Data de término é obrigatória'),
    description: z.string().max(1000, 'Descrição deve ter no máximo 1000 caracteres').optional(),
    style: z
      .enum(['adventure', 'relaxation', 'cultural', 'gastronomic', 'other'] as const)
      .optional()
      .nullable(),
    base_currency: z.enum(SUPPORTED_CURRENCIES),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      return new Date(data.start_date) <= new Date(data.end_date);
    },
    {
      message: 'Data de término deve ser igual ou posterior à data de início',
      path: ['end_date'],
    }
  );

export type CreateTripInput = z.infer<typeof createTripSchema>;

// Update schema without refinements (refinements are not compatible with .partial())
export const updateTripSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nome da viagem é obrigatório')
      .min(2, 'Nome deve ter pelo menos 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres')
      .optional(),
    destination: z
      .string()
      .min(1, 'Destino é obrigatório')
      .min(2, 'Destino deve ter pelo menos 2 caracteres')
      .max(200, 'Destino deve ter no máximo 200 caracteres')
      .optional(),
    start_date: z.string().min(1, 'Data de início é obrigatória').optional(),
    end_date: z.string().min(1, 'Data de término é obrigatória').optional(),
    description: z.string().max(1000, 'Descrição deve ter no máximo 1000 caracteres').optional(),
    style: z
      .enum(['adventure', 'relaxation', 'cultural', 'gastronomic', 'other'] as const)
      .optional()
      .nullable(),
    base_currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      return new Date(data.start_date) <= new Date(data.end_date);
    },
    {
      message: 'Data de término deve ser igual ou posterior à data de início',
      path: ['end_date'],
    }
  );

export type UpdateTripInput = z.infer<typeof updateTripSchema>;
