'use server';

import { createClient } from './server';
import { createAdminClient } from './admin';
import type { AdminAuthResult } from '@/types/admin';

/**
 * Verifica se o usuário autenticado é um administrador do sistema.
 * Retorna o client Supabase (anon) + adminClient (service_role) + role.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return { ok: false, error: 'Não autorizado' };
  }

  const adminClient = createAdminClient();

  const { data: adminRecord } = await adminClient
    .from('system_admins')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!adminRecord) {
    return { ok: false, error: 'Acesso negado: você não é administrador' };
  }

  return {
    ok: true,
    supabase,
    adminClient,
    user: { id: user.id, email: user.email },
    adminRole: adminRecord.role,
  };
}

/**
 * Verifica se o usuário é super_admin (pode gerenciar outros admins).
 */
export async function requireSuperAdmin(): Promise<AdminAuthResult> {
  const result = await requireAdmin();

  if (!result.ok) {
    return result;
  }

  if (result.adminRole !== 'super_admin') {
    return { ok: false, error: 'Apenas super admins podem realizar esta ação' };
  }

  return result;
}
