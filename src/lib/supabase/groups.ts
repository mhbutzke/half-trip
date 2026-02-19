'use server';

import { createClient } from './server';
import { requireTripOrganizer } from './auth-helpers';
import { revalidate } from '@/lib/utils/revalidation';
import { logActivity } from './activity-log';

export type TripGroupWithMembers = {
  id: string;
  tripId: string;
  name: string;
  memberParticipantIds: string[];
  createdAt: string;
};

type GroupResult = {
  error?: string;
  data?: TripGroupWithMembers;
};

type GroupsResult = {
  error?: string;
  data?: TripGroupWithMembers[];
};

/**
 * Retorna todos os grupos da viagem com seus membros (participant IDs).
 */
export async function getTripGroups(tripId: string): Promise<GroupsResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Verificar se é membro da viagem
  const { data: currentMember } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!currentMember) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Buscar grupos
  const { data: groups, error: groupsError } = await supabase
    .from('trip_groups')
    .select('id, trip_id, name, created_at')
    .eq('trip_id', tripId)
    .order('created_at');

  if (groupsError) {
    return { error: groupsError.message };
  }

  if (!groups || groups.length === 0) {
    return { data: [] };
  }

  // Buscar participantes com group_id para mapear membros de cada grupo
  const { data: participants } = await supabase
    .from('trip_participants')
    .select('id, group_id')
    .eq('trip_id', tripId)
    .not('group_id', 'is', null);

  const groupMembersMap = new Map<string, string[]>();
  if (participants) {
    for (const p of participants) {
      if (p.group_id) {
        const existing = groupMembersMap.get(p.group_id) ?? [];
        existing.push(p.id);
        groupMembersMap.set(p.group_id, existing);
      }
    }
  }

  const resolved: TripGroupWithMembers[] = groups.map((g) => ({
    id: g.id,
    tripId: g.trip_id,
    name: g.name,
    memberParticipantIds: groupMembersMap.get(g.id) ?? [],
    createdAt: g.created_at,
  }));

  return { data: resolved };
}

/**
 * Cria um grupo na viagem. Apenas organizadores.
 * Uses atomic RPC function to prevent orphaned groups if participant update fails.
 */
export async function createGroup(
  tripId: string,
  name: string,
  participantIds: string[]
): Promise<GroupResult> {
  const auth = await requireTripOrganizer(tripId);
  if (!auth.ok) {
    return { error: auth.error };
  }

  const { supabase } = auth;

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: 'O nome do grupo é obrigatório' };
  }

  if (participantIds.length < 2) {
    return { error: 'Um grupo precisa de pelo menos 2 participantes' };
  }

  // Atomic RPC: creates group + assigns participants in a single transaction
  const { data: groupId, error: rpcError } = await supabase.rpc('create_group_with_members', {
    p_trip_id: tripId,
    p_name: trimmedName,
    p_participant_ids: participantIds,
  });

  if (rpcError || !groupId) {
    if (rpcError?.code === '23505') {
      return { error: 'Já existe um grupo com esse nome nesta viagem' };
    }
    return { error: rpcError?.message ?? 'Erro ao criar grupo' };
  }

  const resultId = String(groupId);

  // Fetch created group for response
  const { data: group } = await supabase
    .from('trip_groups')
    .select('id, trip_id, name, created_at')
    .eq('id', resultId)
    .single();

  revalidate.tripParticipants(tripId);

  logActivity({
    tripId,
    action: 'created',
    entityType: 'group',
    entityId: resultId,
    metadata: { name: trimmedName, memberCount: participantIds.length },
  });

  return {
    data: {
      id: resultId,
      tripId,
      name: trimmedName,
      memberParticipantIds: participantIds,
      createdAt: group?.created_at ?? new Date().toISOString(),
    },
  };
}

/**
 * Atualiza um grupo (nome e/ou membros). Apenas organizadores.
 */
export async function updateGroup(
  tripId: string,
  groupId: string,
  name?: string,
  participantIds?: string[]
): Promise<GroupResult> {
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
    return { error: 'Apenas organizadores podem editar grupos' };
  }

  // Verificar que o grupo existe e pertence à viagem
  const { data: existing } = await supabase
    .from('trip_groups')
    .select('id, name')
    .eq('id', groupId)
    .eq('trip_id', tripId)
    .single();

  if (!existing) {
    return { error: 'Grupo não encontrado' };
  }

  // Atualizar nome se fornecido
  if (name !== undefined) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { error: 'O nome do grupo é obrigatório' };
    }

    const { error: updateNameError } = await supabase
      .from('trip_groups')
      .update({ name: trimmedName })
      .eq('id', groupId);

    if (updateNameError) {
      if (updateNameError.code === '23505') {
        return { error: 'Já existe um grupo com esse nome nesta viagem' };
      }
      return { error: updateNameError.message };
    }
  }

  // Atualizar membros se fornecido
  let finalParticipantIds: string[] = [];
  if (participantIds !== undefined) {
    if (participantIds.length < 2) {
      return { error: 'Um grupo precisa de pelo menos 2 participantes' };
    }

    // Remover group_id dos participantes antigos
    await supabase
      .from('trip_participants')
      .update({ group_id: null })
      .eq('trip_id', tripId)
      .eq('group_id', groupId);

    // Adicionar group_id aos novos participantes
    const { error: updateMembersError } = await supabase
      .from('trip_participants')
      .update({ group_id: groupId })
      .eq('trip_id', tripId)
      .in('id', participantIds);

    if (updateMembersError) {
      return { error: updateMembersError.message };
    }

    finalParticipantIds = participantIds;
  } else {
    // Buscar membros atuais
    const { data: currentMembers } = await supabase
      .from('trip_participants')
      .select('id')
      .eq('trip_id', tripId)
      .eq('group_id', groupId);

    finalParticipantIds = currentMembers?.map((m) => m.id) ?? [];
  }

  // Buscar grupo atualizado
  const { data: updatedGroup } = await supabase
    .from('trip_groups')
    .select('id, trip_id, name, created_at')
    .eq('id', groupId)
    .single();

  revalidate.tripParticipants(tripId);

  logActivity({
    tripId,
    action: 'updated',
    entityType: 'group',
    entityId: groupId,
    metadata: { name: updatedGroup?.name ?? existing.name },
  });

  return {
    data: {
      id: updatedGroup?.id ?? groupId,
      tripId,
      name: updatedGroup?.name ?? existing.name,
      memberParticipantIds: finalParticipantIds,
      createdAt: updatedGroup?.created_at ?? '',
    },
  };
}

/**
 * Remove um grupo. Os participantes ficam sem grupo. Apenas organizadores.
 */
export async function deleteGroup(
  tripId: string,
  groupId: string
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
    return { error: 'Apenas organizadores podem remover grupos' };
  }

  // Verificar que o grupo existe e pertence à viagem
  const { data: existing } = await supabase
    .from('trip_groups')
    .select('id, name')
    .eq('id', groupId)
    .eq('trip_id', tripId)
    .single();

  if (!existing) {
    return { error: 'Grupo não encontrado' };
  }

  // Deletar (ON DELETE SET NULL cuida dos participantes.group_id)
  const { error: deleteError } = await supabase.from('trip_groups').delete().eq('id', groupId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidate.tripParticipants(tripId);

  logActivity({
    tripId,
    action: 'deleted',
    entityType: 'group',
    entityId: groupId,
    metadata: { name: existing.name },
  });

  return { success: true };
}
