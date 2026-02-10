import { z } from 'zod';

export const checklistCategories = ['packing', 'todo', 'shopping', 'documents', 'other'] as const;

export type ChecklistCategoryValue = (typeof checklistCategories)[number];

export const checklistCategoryLabels: Record<ChecklistCategoryValue, string> = {
  packing: 'Bagagem',
  todo: 'Tarefas',
  shopping: 'Compras',
  documents: 'Documentos',
  other: 'Outros',
};

export const createChecklistSchema = z.object({
  trip_id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo de 100 caracteres'),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(checklistCategories, { message: 'Categoria inválida' }),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;

export const checklistFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo de 100 caracteres'),
  description: z.string().max(500).optional(),
  category: z.enum(checklistCategories, { message: 'Categoria inválida' }),
});

export type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

export const createChecklistItemSchema = z.object({
  checklist_id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Máximo de 200 caracteres'),
  assigned_to: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive().default(1),
});

export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
