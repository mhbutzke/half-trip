import { z } from 'zod';

export const createNoteSchema = z.object({
  trip_id: z.string().uuid('ID da viagem inválido'),
  content: z
    .string()
    .min(1, 'Conteúdo é obrigatório')
    .min(2, 'Nota deve ter pelo menos 2 caracteres')
    .max(5000, 'Nota deve ter no máximo 5000 caracteres'),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
  content: z
    .string()
    .min(1, 'Conteúdo é obrigatório')
    .min(2, 'Nota deve ter pelo menos 2 caracteres')
    .max(5000, 'Nota deve ter no máximo 5000 caracteres'),
});

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
