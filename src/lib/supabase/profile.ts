'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';

export type ProfileResult = {
  error?: string;
  success?: boolean;
  avatarUrl?: string;
};

export async function updateProfile(name: string): Promise<ProfileResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  const { error } = await supabase.from('users').update({ name }).eq('id', authUser.id);

  if (error) {
    return { error: error.message };
  }

  // Also update auth user metadata
  await supabase.auth.updateUser({
    data: { name },
  });

  revalidatePath('/settings');
  revalidatePath('/trips');

  return { success: true };
}

export async function uploadAvatar(formData: FormData): Promise<ProfileResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  const file = formData.get('avatar') as File;

  if (!file || file.size === 0) {
    return { error: 'Nenhum arquivo selecionado' };
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

  // Delete old avatar if exists
  const { data: existingFiles } = await supabase.storage.from('avatars').list(authUser.id);

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map((f) => `${authUser.id}/${f.name}`);
    await supabase.storage.from('avatars').remove(filesToDelete);
  }

  // Upload new avatar
  const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    return { error: `Erro ao enviar arquivo: ${uploadError.message}` };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(fileName);

  // Update user profile with new avatar URL
  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', authUser.id);

  if (updateError) {
    return { error: updateError.message };
  }

  // Also update auth user metadata
  await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });

  revalidatePath('/settings');
  revalidatePath('/trips');

  return { success: true, avatarUrl: publicUrl };
}

export async function removeAvatar(): Promise<ProfileResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Delete avatar files from storage
  const { data: existingFiles } = await supabase.storage.from('avatars').list(authUser.id);

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map((f) => `${authUser.id}/${f.name}`);
    await supabase.storage.from('avatars').remove(filesToDelete);
  }

  // Update user profile to remove avatar URL
  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: null })
    .eq('id', authUser.id);

  if (updateError) {
    return { error: updateError.message };
  }

  // Also update auth user metadata
  await supabase.auth.updateUser({
    data: { avatar_url: null },
  });

  revalidatePath('/settings');
  revalidatePath('/trips');

  return { success: true };
}

export async function getUserProfile() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();

  return profile;
}
