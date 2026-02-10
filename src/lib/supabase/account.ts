'use server';

import { createClient } from './server';

export type AccountResult = {
  error?: string;
  success?: boolean;
};

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<AccountResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Não autorizado' };
  }

  // Verify current password by attempting sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'Senha atual incorreta' };
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true };
}

export async function deleteAccount(): Promise<AccountResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Não autorizado' };
  }

  // Delete user data (RLS cascading will handle related records)
  const { error: deleteError } = await supabase.from('users').delete().eq('id', user.id);

  if (deleteError) {
    return { error: 'Erro ao excluir dados da conta. Tente novamente.' };
  }

  // Sign out after deletion
  await supabase.auth.signOut();

  return { success: true };
}
