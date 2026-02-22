'use server';

import { createClient } from './server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TripMemberRole } from '@/types/database';

type AuthenticatedUser = {
  id: string;
  email?: string;
};

type TripMemberInfo = {
  supabase: SupabaseClient<Database>;
  user: AuthenticatedUser;
  memberId: string;
  role: TripMemberRole;
};

type AuthResult =
  | { ok: true; supabase: SupabaseClient<Database>; user: AuthenticatedUser }
  | { ok: false; error: string };

type TripMemberResult = ({ ok: true } & TripMemberInfo) | { ok: false; error: string };

/**
 * Autentica o usuário atual. Retorna o client Supabase e dados do user.
 * Elimina a necessidade de repetir auth.getUser() em cada server action.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { ok: false, error: 'Não autorizado' };
    }
    user = data.user;
  } catch {
    return { ok: false, error: 'Não autorizado' };
  }

  return { ok: true, supabase, user: { id: user.id, email: user.email } };
}

/**
 * Autentica o usuário E verifica que é membro da viagem em uma única operação.
 * Retorna supabase client, user, memberId e role.
 *
 * Substitui o padrão repetitivo de:
 *   1. auth.getUser()
 *   2. trip_members.select('id/role').eq(trip_id).eq(user_id).single()
 */
export async function requireTripMember(tripId: string): Promise<TripMemberResult> {
  const auth = await requireAuth();

  if (!auth.ok) {
    return auth;
  }

  const { data: member } = await auth.supabase
    .from('trip_members')
    .select('id, role')
    .eq('trip_id', tripId)
    .eq('user_id', auth.user.id)
    .single();

  if (!member) {
    return { ok: false, error: 'Você não é membro desta viagem' };
  }

  return {
    ok: true,
    supabase: auth.supabase,
    user: auth.user,
    memberId: member.id,
    role: member.role as TripMemberRole,
  };
}

/**
 * Autentica o usuário E verifica que é organizador da viagem.
 */
export async function requireTripOrganizer(tripId: string): Promise<TripMemberResult> {
  const result = await requireTripMember(tripId);

  if (!result.ok) {
    return result;
  }

  if (result.role !== 'organizer') {
    return { ok: false, error: 'Apenas organizadores podem realizar esta ação' };
  }

  return result;
}
