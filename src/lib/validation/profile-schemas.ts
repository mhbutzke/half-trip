import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// Avatar file validation
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'Arquivo muito grande. O tamanho máximo é 5MB.';
  }

  return null;
}
