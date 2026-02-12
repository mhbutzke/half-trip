'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';
import { logActivity } from './activity-log';
import type { Settlement } from '@/types/database';

export type SettlementResult = {
  error?: string;
  success?: boolean;
  settlementId?: string;
};

export type SettlementWithUsers = Settlement & {
  from_user_data: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  to_user_data: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
};

export type CreateSettlementInput = {
  trip_id: string;
  from_user: string;
  to_user: string;
  amount: number;
};

/**
 * Creates a new settlement record
 */
export async function createSettlement(input: CreateSettlementInput): Promise<SettlementResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', input.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Validate that both users are trip members
  const { count: fromUserCount } = await supabase
    .from('trip_members')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', input.trip_id)
    .eq('user_id', input.from_user);

  const { count: toUserCount } = await supabase
    .from('trip_members')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', input.trip_id)
    .eq('user_id', input.to_user);

  if (!fromUserCount || !toUserCount) {
    return { error: 'Os usuários devem ser membros desta viagem' };
  }

  if (input.amount <= 0) {
    return { error: 'O valor deve ser maior que zero' };
  }

  // Create the settlement
  const { data: settlement, error: settlementError } = await supabase
    .from('settlements')
    .insert({
      trip_id: input.trip_id,
      from_user: input.from_user,
      to_user: input.to_user,
      amount: input.amount,
    })
    .select('id')
    .single();

  if (settlementError) {
    return { error: settlementError.message };
  }

  revalidatePath(`/trip/${input.trip_id}/balance`);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'settlement',
    entityId: settlement.id,
    metadata: { amount: input.amount },
  });

  return { success: true, settlementId: settlement.id };
}

/**
 * Marks a settlement as paid
 */
export async function markSettlementAsPaid(settlementId: string): Promise<SettlementResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Get the settlement to check trip membership
  const { data: settlement } = await supabase
    .from('settlements')
    .select('trip_id, from_user, to_user, settled_at')
    .eq('id', settlementId)
    .single();

  if (!settlement) {
    return { error: 'Acerto não encontrado' };
  }

  if (settlement.settled_at) {
    return { error: 'Este acerto já foi marcado como pago' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', settlement.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Only the from_user, to_user, or organizers can mark as paid
  if (
    authUser.id !== settlement.from_user &&
    authUser.id !== settlement.to_user &&
    member.role !== 'organizer'
  ) {
    return { error: 'Você não tem permissão para marcar este acerto como pago' };
  }

  // Mark as settled
  const { error: updateError } = await supabase
    .from('settlements')
    .update({ settled_at: new Date().toISOString() })
    .eq('id', settlementId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/trip/${settlement.trip_id}/balance`);

  logActivity({
    tripId: settlement.trip_id,
    action: 'marked_paid',
    entityType: 'settlement',
    entityId: settlementId,
  });

  return { success: true, settlementId };
}

/**
 * Marks a settlement as unpaid (removes settled_at)
 */
export async function markSettlementAsUnpaid(settlementId: string): Promise<SettlementResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Get the settlement to check trip membership
  const { data: settlement } = await supabase
    .from('settlements')
    .select('trip_id, from_user, to_user, settled_at')
    .eq('id', settlementId)
    .single();

  if (!settlement) {
    return { error: 'Acerto não encontrado' };
  }

  if (!settlement.settled_at) {
    return { error: 'Este acerto não foi marcado como pago' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', settlement.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Only the from_user, to_user, or organizers can mark as unpaid
  if (
    authUser.id !== settlement.from_user &&
    authUser.id !== settlement.to_user &&
    member.role !== 'organizer'
  ) {
    return {
      error: 'Você não tem permissão para desmarcar este acerto como pago',
    };
  }

  // Remove settled_at
  const { error: updateError } = await supabase
    .from('settlements')
    .update({ settled_at: null })
    .eq('id', settlementId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/trip/${settlement.trip_id}/balance`);

  logActivity({
    tripId: settlement.trip_id,
    action: 'marked_unpaid',
    entityType: 'settlement',
    entityId: settlementId,
  });

  return { success: true, settlementId };
}

/**
 * Deletes a settlement
 */
export async function deleteSettlement(settlementId: string): Promise<SettlementResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Get the settlement to check trip membership
  const { data: settlement } = await supabase
    .from('settlements')
    .select('trip_id')
    .eq('id', settlementId)
    .single();

  if (!settlement) {
    return { error: 'Acerto não encontrado' };
  }

  // Check if user is an organizer of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', settlement.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member || member.role !== 'organizer') {
    return { error: 'Apenas organizadores podem excluir acertos' };
  }

  // Delete settlement
  const { error } = await supabase.from('settlements').delete().eq('id', settlementId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/trip/${settlement.trip_id}/balance`);

  return { success: true };
}

/**
 * Gets all settlements for a trip, ordered by creation date (newest first)
 */
export async function getTripSettlements(tripId: string): Promise<SettlementWithUsers[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return [];
  }

  const { data: settlements } = await supabase
    .from('settlements')
    .select(
      `
      *,
      from_user_data:users!settlements_from_user_fkey (
        id,
        name,
        avatar_url
      ),
      to_user_data:users!settlements_to_user_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  return (settlements as SettlementWithUsers[]) || [];
}

/**
 * Gets pending (unpaid) settlements for a trip
 */
export async function getPendingSettlements(tripId: string): Promise<SettlementWithUsers[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return [];
  }

  const { data: settlements } = await supabase
    .from('settlements')
    .select(
      `
      *,
      from_user_data:users!settlements_from_user_fkey (
        id,
        name,
        avatar_url
      ),
      to_user_data:users!settlements_to_user_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .is('settled_at', null)
    .order('created_at', { ascending: false });

  return (settlements as SettlementWithUsers[]) || [];
}

/**
 * Gets settled settlements for a trip (settlement history)
 */
export async function getSettledSettlements(tripId: string): Promise<SettlementWithUsers[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return [];
  }

  const { data: settlements } = await supabase
    .from('settlements')
    .select(
      `
      *,
      from_user_data:users!settlements_from_user_fkey (
        id,
        name,
        avatar_url
      ),
      to_user_data:users!settlements_to_user_fkey (
        id,
        name,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .not('settled_at', 'is', null)
    .order('settled_at', { ascending: false });

  return (settlements as SettlementWithUsers[]) || [];
}

/**
 * Gets settlements count for a trip
 */
export async function getSettlementsCount(tripId: string): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return 0;
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return 0;
  }

  const { count } = await supabase
    .from('settlements')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  return count || 0;
}
