import { z } from 'zod';
import type { ActivityCategory } from '@/types/database';

export const activityCategories: { value: ActivityCategory; label: string }[] = [
  { value: 'transport', label: 'Transporte' },
  { value: 'accommodation', label: 'Hospedagem' },
  { value: 'tour', label: 'Passeio' },
  { value: 'meal', label: 'Refeição' },
  { value: 'event', label: 'Evento' },
  { value: 'other', label: 'Outro' },
];

export const activityLinkSchema = z.object({
  url: z.string().url('URL inválida'),
  label: z.string().min(1, 'Nome do link é obrigatório').max(100, 'Nome muito longo'),
});

export const createActivitySchema = z.object({
  trip_id: z.string().uuid('ID da viagem inválido'),
  title: z
    .string()
    .min(1, 'Título é obrigatório')
    .min(2, 'Título deve ter pelo menos 2 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  date: z.string().min(1, 'Data é obrigatória'),
  start_time: z
    .string()
    .refine(
      (val) => val === '' || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/.test(val),
      'Horário inválido (use HH:MM)'
    )
    .optional(),
  duration_minutes: z
    .number()
    .positive('Duração deve ser positiva')
    .int('Duração deve ser um número inteiro')
    .max(1440, 'Duração máxima é 24 horas (1440 minutos)')
    .optional()
    .nullable(),
  location: z.string().max(300, 'Local deve ter no máximo 300 caracteres').optional().nullable(),
  description: z
    .string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
    .optional()
    .nullable(),
  category: z
    .enum(['transport', 'accommodation', 'tour', 'meal', 'event', 'other'] as const, {
      message: 'Categoria inválida',
    })
    .refine((val) => val !== undefined, { message: 'Categoria é obrigatória' }),
  transport_type: z
    .enum(['car', 'plane', 'bus', 'train', 'ship', 'bike', 'other'] as const)
    .optional()
    .nullable(),
  links: z.array(activityLinkSchema).optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = createActivitySchema.omit({ trip_id: true }).partial();

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

// Schema for adding a single link
export const addLinkSchema = z.object({
  url: z.string().min(1, 'URL é obrigatória').url('URL inválida'),
  label: z.string().min(1, 'Nome do link é obrigatório').max(100, 'Nome muito longo'),
});

export type AddLinkInput = z.infer<typeof addLinkSchema>;
