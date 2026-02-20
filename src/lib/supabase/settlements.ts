'use server';

import { requireTripMember, requireAuth } from './auth-helpers';
import { revalidate } from '@/lib/utils/revalidation';
import { logActivity } from './activity-log';
import { splitEntitySettlement } from '@/lib/balance/settlement-helpers';
import type { EntitySettlement } from '@/lib/balance/types';
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
  } | null;
  to_user_data: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
};

export type CreateSettlementInput = {
  trip_id: string;
  from_participant_id: string;
  to_participant_id: string;
  amount: number;
};

/**
 * Creates a new settlement record
 */
export async function createSettlement(input: CreateSettlementInput): Promise<SettlementResult> {
  const auth = await requireTripMember(input.trip_id);
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase } = auth;

  if (input.amount <= 0) {
    return { error: 'O valor deve ser maior que zero' };
  }

  // Validate participants exist in this trip
  const { count } = await supabase
    .from('trip_participants')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', input.trip_id)
    .in('id', [input.from_participant_id, input.to_participant_id]);

  if ((count ?? 0) < 2) {
    return { error: 'Os participantes devem fazer parte desta viagem' };
  }

  // Create the settlement — legacy from_user/to_user auto-populated by DB trigger
  const { data: settlement, error: settlementError } = await supabase
    .from('settlements')
    .insert({
      trip_id: input.trip_id,
      from_participant_id: input.from_participant_id,
      to_participant_id: input.to_participant_id,
      amount: input.amount,
    })
    .select('id')
    .single();

  if (settlementError) {
    return { error: 'Erro ao criar acerto' };
  }

  revalidate.tripBalance(input.trip_id);

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
 * Creates settlement records for an entity-level settlement.
 * Splits the entity settlement into individual participant settlements.
 */
export async function createEntitySettlement(input: {
  trip_id: string;
  entitySettlement: EntitySettlement;
}): Promise<SettlementResult> {
  const auth = await requireTripMember(input.trip_id);
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase } = auth;

  // Split entity settlement into individual settlements
  const individualSettlements = splitEntitySettlement(input.entitySettlement);

  // Create all individual settlements — legacy from_user/to_user auto-populated by DB trigger
  const rows = individualSettlements.map((s) => ({
    trip_id: input.trip_id,
    from_participant_id: s.fromParticipantId,
    to_participant_id: s.toParticipantId,
    amount: s.amount,
  }));

  const { data: settlements, error: insertError } = await supabase
    .from('settlements')
    .insert(rows)
    .select('id');

  if (insertError) {
    return { error: 'Erro ao criar acertos' };
  }

  revalidate.tripBalance(input.trip_id);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'settlement',
    entityId: settlements?.[0]?.id ?? '',
    metadata: {
      amount: input.entitySettlement.amount,
      type: 'entity',
      count: rows.length,
    },
  });

  return { success: true, settlementId: settlements?.[0]?.id };
}

/**
 * Marks a settlement as paid
 */
export async function markSettlementAsPaid(settlementId: string): Promise<SettlementResult> {
  const auth = await requireAuth();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user: authUser } = auth;

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
  // For guests (from_user/to_user is null), only organizers can mark as paid
  const isFromUser = settlement.from_user && authUser.id === settlement.from_user;
  const isToUser = settlement.to_user && authUser.id === settlement.to_user;
  if (!isFromUser && !isToUser && member.role !== 'organizer') {
    return { error: 'Você não tem permissão para marcar este acerto como pago' };
  }

  // Mark as settled
  const { error: updateError } = await supabase
    .from('settlements')
    .update({ settled_at: new Date().toISOString() })
    .eq('id', settlementId);

  if (updateError) {
    return { error: 'Erro ao marcar acerto como pago' };
  }

  revalidate.tripBalance(settlement.trip_id);

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
  const auth = await requireAuth();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user: authUser } = auth;

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
  // For guests (from_user/to_user is null), only organizers can mark as unpaid
  const isFromUser = settlement.from_user && authUser.id === settlement.from_user;
  const isToUser = settlement.to_user && authUser.id === settlement.to_user;
  if (!isFromUser && !isToUser && member.role !== 'organizer') {
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
    return { error: 'Erro ao desmarcar acerto' };
  }

  revalidate.tripBalance(settlement.trip_id);

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
  const auth = await requireAuth();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user: authUser } = auth;

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
    return { error: 'Erro ao excluir acerto' };
  }

  revalidate.tripBalance(settlement.trip_id);

  return { success: true };
}

/**
 * Gets all settlements for a trip, ordered by creation date (newest first)
 */
export async function getTripSettlements(tripId: string): Promise<SettlementWithUsers[]> {
  const auth = await requireTripMember(tripId);
  if (!auth.ok) {
    return [];
  }
  const { supabase } = auth;

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
  const auth = await requireTripMember(tripId);
  if (!auth.ok) {
    return [];
  }
  const { supabase } = auth;

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
  const auth = await requireTripMember(tripId);
  if (!auth.ok) {
    return [];
  }
  const { supabase } = auth;

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
  const auth = await requireTripMember(tripId);
  if (!auth.ok) {
    return 0;
  }
  const { supabase } = auth;

  const { count } = await supabase
    .from('settlements')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  return count || 0;
}
