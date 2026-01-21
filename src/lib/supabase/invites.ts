'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';
import type { TripInvite, User } from '@/types/database';

// Default invite expiration: 7 days
const DEFAULT_INVITE_EXPIRATION_DAYS = 7;

export type InviteResult = {
  error?: string;
  success?: boolean;
  invite?: TripInvite;
  inviteUrl?: string;
};

export type TripInviteWithInviter = TripInvite & {
  users: Pick<User, 'id' | 'name' | 'avatar_url'>;
};

/**
 * Generates a short, unique invite code
 * Uses base62 encoding (alphanumeric) for URL-friendliness
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const codeLength = 8;
  let code = '';

  // Use crypto for secure random generation
  const randomValues = new Uint8Array(codeLength);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < codeLength; i++) {
    code += chars[randomValues[i] % chars.length];
  }

  return code;
}

/**
 * Creates a new invite link for a trip
 */
export async function createInviteLink(
  tripId: string,
  expirationDays: number = DEFAULT_INVITE_EXPIRATION_DAYS
): Promise<InviteResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Check if user is a member of the trip (any member can create invite links)
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  // Generate unique invite code
  let code = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 5;

  // Ensure code is unique
  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('trip_invites')
      .select('id')
      .eq('code', code)
      .single();

    if (!existing) break;
    code = generateInviteCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    return { error: 'Erro ao gerar código de convite. Tente novamente.' };
  }

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  // Create the invite
  const { data: invite, error: insertError } = await supabase
    .from('trip_invites')
    .insert({
      trip_id: tripId,
      code,
      invited_by: authUser.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath(`/trip/${tripId}`);

  // Build the invite URL (will be prepended with base URL on client)
  const inviteUrl = `/invite/${code}`;

  return { success: true, invite, inviteUrl };
}

/**
 * Gets all active (non-expired, non-accepted) invites for a trip
 */
export async function getTripInvites(tripId: string): Promise<TripInviteWithInviter[]> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return [];
  }

  // Check if user is a member
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return [];
  }

  const now = new Date().toISOString();

  const { data: invites } = await supabase
    .from('trip_invites')
    .select(
      `
      *,
      users!trip_invites_invited_by_fkey (id, name, avatar_url)
    `
    )
    .eq('trip_id', tripId)
    .is('accepted_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  return (invites as TripInviteWithInviter[]) || [];
}

/**
 * Revokes (deletes) an invite link
 */
export async function revokeInvite(inviteId: string): Promise<InviteResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Não autorizado' };
  }

  // Get the invite to check permissions
  const { data: invite } = await supabase
    .from('trip_invites')
    .select('trip_id, invited_by')
    .eq('id', inviteId)
    .single();

  if (!invite) {
    return { error: 'Convite não encontrado' };
  }

  // Check if user is an organizer or the one who created the invite
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Você não é membro desta viagem' };
  }

  if (member.role !== 'organizer' && invite.invited_by !== authUser.id) {
    return { error: 'Apenas organizadores ou o criador do convite podem revogá-lo' };
  }

  const { error: deleteError } = await supabase.from('trip_invites').delete().eq('id', inviteId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath(`/trip/${invite.trip_id}`);

  return { success: true };
}

/**
 * Validates an invite code and returns the invite details
 */
export async function validateInviteCode(
  code: string
): Promise<{ valid: boolean; invite?: TripInvite; error?: string; tripName?: string }> {
  const supabase = await createClient();

  const { data: invite, error } = await supabase
    .from('trip_invites')
    .select(
      `
      *,
      trips!trip_invites_trip_id_fkey (name, destination)
    `
    )
    .eq('code', code)
    .single();

  if (error || !invite) {
    return { valid: false, error: 'Convite não encontrado' };
  }

  // Check if already accepted
  if (invite.accepted_at) {
    return { valid: false, error: 'Este convite já foi utilizado' };
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(invite.expires_at);

  if (now > expiresAt) {
    return { valid: false, error: 'Este convite expirou' };
  }

  const tripData = invite.trips as unknown as { name: string; destination: string };

  return {
    valid: true,
    invite,
    tripName: tripData?.name,
  };
}

/**
 * Gets the count of pending (active) invites for a trip
 */
export async function getPendingInviteCount(tripId: string): Promise<number> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { count } = await supabase
    .from('trip_invites')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId)
    .is('accepted_at', null)
    .gt('expires_at', now);

  return count || 0;
}

export type InviteDetailsResult = {
  valid: boolean;
  error?: string;
  invite?: TripInvite;
  trip?: {
    id: string;
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    cover_url: string | null;
  };
  invitedBy?: Pick<User, 'id' | 'name' | 'avatar_url'>;
  isAlreadyMember?: boolean;
};

/**
 * Gets full invite details for the invite page
 */
export async function getInviteDetails(code: string): Promise<InviteDetailsResult> {
  const supabase = await createClient();

  const { data: invite, error } = await supabase
    .from('trip_invites')
    .select(
      `
      *,
      trips!trip_invites_trip_id_fkey (id, name, destination, start_date, end_date, cover_url),
      users!trip_invites_invited_by_fkey (id, name, avatar_url)
    `
    )
    .eq('code', code)
    .single();

  if (error || !invite) {
    return { valid: false, error: 'Convite não encontrado' };
  }

  // Check if already accepted
  if (invite.accepted_at) {
    return { valid: false, error: 'Este convite já foi utilizado' };
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(invite.expires_at);

  if (now > expiresAt) {
    return { valid: false, error: 'Este convite expirou' };
  }

  const tripData = invite.trips as unknown as {
    id: string;
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    cover_url: string | null;
  };
  const inviterData = invite.users as unknown as Pick<User, 'id' | 'name' | 'avatar_url'>;

  // Check if current user is already a member
  let isAlreadyMember = false;
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    const { data: membership } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', authUser.id)
      .single();

    isAlreadyMember = !!membership;
  }

  return {
    valid: true,
    invite,
    trip: tripData,
    invitedBy: inviterData,
    isAlreadyMember,
  };
}

export type AcceptInviteResult = {
  error?: string;
  success?: boolean;
  tripId?: string;
};

/**
 * Accepts an invite and adds the user to the trip as a participant
 */
export async function acceptInvite(code: string): Promise<AcceptInviteResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Você precisa estar logado para aceitar o convite' };
  }

  // Validate the invite
  const { data: invite, error: inviteError } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('code', code)
    .single();

  if (inviteError || !invite) {
    return { error: 'Convite não encontrado' };
  }

  if (invite.accepted_at) {
    return { error: 'Este convite já foi utilizado' };
  }

  const now = new Date();
  const expiresAt = new Date(invite.expires_at);

  if (now > expiresAt) {
    return { error: 'Este convite expirou' };
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', authUser.id)
    .single();

  if (existingMember) {
    return { error: 'Você já é membro desta viagem', tripId: invite.trip_id };
  }

  // Add user to trip as participant
  const { error: memberError } = await supabase.from('trip_members').insert({
    trip_id: invite.trip_id,
    user_id: authUser.id,
    role: 'participant',
    invited_by: invite.invited_by,
  });

  if (memberError) {
    return { error: memberError.message };
  }

  // Mark invite as accepted
  const { error: updateError } = await supabase
    .from('trip_invites')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: authUser.id,
    })
    .eq('id', invite.id);

  if (updateError) {
    // Log error but don't fail - user was already added to trip
    console.error('Failed to mark invite as accepted:', updateError);
  }

  revalidatePath(`/trip/${invite.trip_id}`);
  revalidatePath('/trips');

  return { success: true, tripId: invite.trip_id };
}
