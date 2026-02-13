import { z } from 'zod';

export const createPollSchema = z.object({
  trip_id: z.string().uuid('ID da viagem inválido'),
  question: z
    .string()
    .min(1, 'Pergunta é obrigatória')
    .min(3, 'Pergunta deve ter pelo menos 3 caracteres')
    .max(200, 'Pergunta deve ter no máximo 200 caracteres'),
  options: z
    .array(z.string().min(1, 'Opção não pode ser vazia').max(100))
    .min(2, 'Adicione pelo menos 2 opções')
    .max(10, 'Máximo de 10 opções'),
  allow_multiple: z.boolean(),
  closes_at: z.string().optional(),
});

export type CreatePollFormValues = z.infer<typeof createPollSchema>;
