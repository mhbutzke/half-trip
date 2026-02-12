'use server';

import { createClient } from './server';

interface UploadResult {
  url?: string;
  error?: string;
}

/**
 * Upload a trip cover image to Supabase Storage.
 * Stores in `trip-covers` bucket, returns public URL.
 */
export async function uploadTripCover(tripId: string, formData: FormData): Promise<UploadResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Não autorizado' };
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return { error: 'Nenhum arquivo enviado' };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: 'Imagem deve ter no máximo 2MB' };
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${tripId}/cover.${ext}`;

  // Remove existing cover
  const { data: existing } = await supabase.storage.from('trip-covers').list(tripId);
  if (existing && existing.length > 0) {
    await supabase.storage.from('trip-covers').remove(existing.map((f) => `${tripId}/${f.name}`));
  }

  // Upload new cover
  const { error: uploadError } = await supabase.storage.from('trip-covers').upload(filePath, file, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    return { error: 'Erro ao fazer upload da imagem' };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('trip-covers').getPublicUrl(filePath);

  // Update trip record
  const { error: updateError } = await supabase
    .from('trips')
    .update({ cover_url: publicUrl })
    .eq('id', tripId);

  if (updateError) {
    return { error: 'Erro ao atualizar viagem' };
  }

  return { url: publicUrl };
}
