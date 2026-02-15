'use server';

import { createClient } from './server';
import { revalidate } from '@/lib/utils/revalidation';
import { logActivity } from './activity-log';

export type TripParticipantResolved = {
  id: string;
  tripId: string;
  type: 'member' | 'guest';
  userId: string | null;
  displayName: string;
  displayEmail: string | null;
  displayAvatar: string | null;
  groupId: string | null;
  role: 'organizer' | 'participant' | null;
};

type ParticipantResult = {
  error?: string;
  data?: TripParticipantResolved;
};

type ParticipantsResult = {
  error?: string;
  data?: TripParticipantResolved[];
};

/**
 * Retorna todos os participantes (membros + convidados) com dados resolvidos.
 */
export async function getTripParticipants(tripId: string): Promise<ParticipantsResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Verificar se o usuário é membro da viagem
  const { data: currentMember } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!currentMember) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Buscar participantes com dados do usuário (para membros)
  const { data: participants, error: participantsError } = await supabase
    .from('trip_participants')
    .select(
      `
      id,
      trip_id,
      user_id,
      guest_name,
      guest_email,
      guest_avatar_url,
      type,
      group_id,
      created_at,
      users!trip_participants_user_id_fkey (
        id,
        name,
        email,
        avatar_url
      )
    `
    )
    .eq('trip_id', tripId)
    .order('created_at');

  if (participantsError) {
    return { error: participantsError.message };
  }

  if (!participants || participants.length === 0) {
    return { data: [] };
  }

  // Buscar roles dos membros
  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id, role')
    .eq('trip_id', tripId);

  const roleMap = new Map<string, 'organizer' | 'participant'>();
  if (members) {
    for (const m of members) {
      roleMap.set(m.user_id, m.role as 'organizer' | 'participant');
    }
  }

  // Montar TripParticipantResolved[]
  const resolved: TripParticipantResolved[] = participants.map((p) => {
    const user = p.users as {
      id: string;
      name: string;
      email: string;
      avatar_url: string | null;
    } | null;

    if (p.type === 'member' && user) {
      return {
        id: p.id,
        tripId: p.trip_id,
        type: 'member' as const,
        userId: p.user_id,
        displayName: user.name,
        displayEmail: user.email,
        displayAvatar: user.avatar_url,
        groupId: p.group_id,
        role: roleMap.get(p.user_id!) ?? null,
      };
    }

    // Convidado
    return {
      id: p.id,
      tripId: p.trip_id,
      type: 'guest' as const,
      userId: null,
      displayName: p.guest_name ?? 'Convidado',
      displayEmail: p.guest_email ?? null,
      displayAvatar: p.guest_avatar_url ?? null,
      groupId: p.group_id,
      role: null,
    };
  });

  return { data: resolved };
}

/**
 * Adiciona um convidado (guest) à viagem. Apenas organizadores.
 */
export async function addGuest(
  tripId: string,
  name: string,
  email?: string
): Promise<ParticipantResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Verificar se é organizador
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member || member.role !== 'organizer') {
    return { error: 'Apenas organizadores podem realizar esta ação' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: 'O nome do convidado é obrigatório' };
  }

  const { data: participant, error: insertError } = await supabase
    .from('trip_participants')
    .insert({
      trip_id: tripId,
      type: 'guest',
      guest_name: trimmedName,
      guest_email: email?.trim() || null,
    })
    .select('id, trip_id, user_id, guest_name, guest_email, guest_avatar_url, type, group_id')
    .single();

  if (insertError) {
    return { error: insertError.message };
  }

  revalidate.tripParticipants(tripId);

  logActivity({
    tripId,
    action: 'created',
    entityType: 'participant',
    entityId: participant.id,
    metadata: { name: trimmedName, type: 'guest' },
  });

  return {
    data: {
      id: participant.id,
      tripId: participant.trip_id,
      type: 'guest',
      userId: null,
      displayName: participant.guest_name ?? trimmedName,
      displayEmail: participant.guest_email ?? null,
      displayAvatar: participant.guest_avatar_url ?? null,
      groupId: participant.group_id,
      role: null,
    },
  };
}

/**
 * Remove um convidado (guest) da viagem. Apenas organizadores.
 */
export async function removeGuest(
  tripId: string,
  participantId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Verificar se é organizador
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member || member.role !== 'organizer') {
    return { error: 'Apenas organizadores podem realizar esta ação' };
  }

  // Verificar que o participante é do tipo guest
  const { data: participant } = await supabase
    .from('trip_participants')
    .select('id, type, guest_name')
    .eq('id', participantId)
    .eq('trip_id', tripId)
    .single();

  if (!participant) {
    return { error: 'Participante não encontrado' };
  }

  if (participant.type !== 'guest') {
    return { error: 'Apenas convidados podem ser removidos por esta ação' };
  }

  const { error: deleteError } = await supabase
    .from('trip_participants')
    .delete()
    .eq('id', participantId)
    .eq('trip_id', tripId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidate.tripParticipants(tripId);

  logActivity({
    tripId,
    action: 'deleted',
    entityType: 'participant',
    entityId: participantId,
    metadata: { name: participant.guest_name, type: 'guest' },
  });

  return { success: true };
}

/**
 * Atualiza dados de um convidado (guest). Apenas organizadores.
 */
export async function updateGuest(
  tripId: string,
  participantId: string,
  name: string,
  email?: string
): Promise<ParticipantResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Verificar se é organizador
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member || member.role !== 'organizer') {
    return { error: 'Apenas organizadores podem realizar esta ação' };
  }

  // Verificar que o participante é do tipo guest
  const { data: existing } = await supabase
    .from('trip_participants')
    .select('id, type')
    .eq('id', participantId)
    .eq('trip_id', tripId)
    .single();

  if (!existing) {
    return { error: 'Participante não encontrado' };
  }

  if (existing.type !== 'guest') {
    return { error: 'Apenas convidados podem ser editados por esta ação' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: 'O nome do convidado é obrigatório' };
  }

  const { data: updated, error: updateError } = await supabase
    .from('trip_participants')
    .update({
      guest_name: trimmedName,
      guest_email: email?.trim() || null,
    })
    .eq('id', participantId)
    .eq('trip_id', tripId)
    .select('id, trip_id, user_id, guest_name, guest_email, guest_avatar_url, type, group_id')
    .single();

  if (updateError) {
    return { error: updateError.message };
  }

  revalidate.tripParticipants(tripId);

  logActivity({
    tripId,
    action: 'updated',
    entityType: 'participant',
    entityId: participantId,
    metadata: { name: trimmedName, type: 'guest' },
  });

  return {
    data: {
      id: updated.id,
      tripId: updated.trip_id,
      type: 'guest',
      userId: null,
      displayName: updated.guest_name ?? trimmedName,
      displayEmail: updated.guest_email ?? null,
      displayAvatar: updated.guest_avatar_url ?? null,
      groupId: updated.group_id,
      role: null,
    },
  };
}

/**
 * Retorna o participant_id a partir do user_id para uma viagem.
 */
export async function getParticipantId(tripId: string, userId: string): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  const { data: participant } = await supabase
    .from('trip_participants')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('type', 'member')
    .single();

  return participant?.id ?? null;
}
