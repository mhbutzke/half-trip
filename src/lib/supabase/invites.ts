'use server';

import { createClient } from './server';
import { revalidate } from '@/lib/utils/revalidation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TripInvite, User } from '@/types/database';
import { InviteEmail } from '@/lib/email/invite-email';
import { parseDateOnly } from '@/lib/utils/date-only';
import { sendEmail } from '@/lib/email/service';
import { getUnsubscribeFooterUrl } from '@/lib/email/unsubscribe-token';
import { render } from '@react-email/components';
import { routes } from '@/lib/routes';
import { canRevokeInvite } from '@/lib/permissions/trip-permissions';
import { logActivity } from '@/lib/supabase/activity-log';
import { logError } from '@/lib/errors/logger';

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
    return { error: 'Erro ao criar convite' };
  }

  revalidate.trip(tripId);

  logActivity({
    tripId,
    action: 'created',
    entityType: 'invite',
    entityId: invite.id,
    metadata: { code },
  });

  // Build the invite URL (will be prepended with base URL on client)
  const inviteUrl = routes.invite(code);

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

  if (!canRevokeInvite(member.role, invite.invited_by === authUser.id)) {
    return { error: 'Apenas organizadores ou o criador do convite podem revogá-lo' };
  }

  const { error: deleteError } = await supabase.from('trip_invites').delete().eq('id', inviteId);

  if (deleteError) {
    return { error: 'Erro ao revogar convite' };
  }

  revalidate.trip(invite.trip_id);

  logActivity({
    tripId: invite.trip_id,
    action: 'revoked',
    entityType: 'invite',
    entityId: inviteId,
  });

  return { success: true };
}

/**
 * Validates an invite code and returns the invite details.
 * Uses SECURITY DEFINER RPC to bypass RLS (non-members need to read invites).
 */
export async function validateInviteCode(
  code: string
): Promise<{ valid: boolean; invite?: TripInvite; error?: string; tripName?: string }> {
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc('get_invite_by_code', {
    p_code: code,
  });

  if (error || !result) {
    return { valid: false, error: 'Convite não encontrado' };
  }

  const invite = result as unknown as TripInvite & {
    trip: { name: string; destination: string };
  };

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

  return {
    valid: true,
    invite,
    tripName: invite.trip?.name,
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
 * Gets full invite details for the invite page.
 * Uses SECURITY DEFINER RPC to bypass RLS (non-members need to see invite info).
 */
export async function getInviteDetails(code: string): Promise<InviteDetailsResult> {
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc('get_invite_by_code', {
    p_code: code,
  });

  if (error || !result) {
    return { valid: false, error: 'Convite não encontrado' };
  }

  const data = result as unknown as {
    id: string;
    trip_id: string;
    code: string;
    email: string | null;
    invited_by: string;
    expires_at: string;
    accepted_at: string | null;
    accepted_by: string | null;
    created_at: string;
    trip: {
      id: string;
      name: string;
      destination: string;
      start_date: string;
      end_date: string;
      cover_url: string | null;
    };
    inviter: Pick<User, 'id' | 'name' | 'avatar_url'>;
  };

  // Check if already accepted
  if (data.accepted_at) {
    return { valid: false, error: 'Este convite já foi utilizado' };
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(data.expires_at);

  if (now > expiresAt) {
    return { valid: false, error: 'Este convite expirou' };
  }

  // Reconstruct invite object for backward compatibility
  const invite = {
    id: data.id,
    trip_id: data.trip_id,
    code: data.code,
    email: data.email,
    invited_by: data.invited_by,
    expires_at: data.expires_at,
    accepted_at: data.accepted_at,
    accepted_by: data.accepted_by,
    created_at: data.created_at,
  } as TripInvite;

  // Check if current user is already a member
  let isAlreadyMember = false;
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    const { data: membership } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', data.trip_id)
      .eq('user_id', authUser.id)
      .single();

    isAlreadyMember = !!membership;
  }

  return {
    valid: true,
    invite,
    trip: data.trip,
    invitedBy: data.inviter,
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

  // Validate the invite via SECURITY DEFINER RPC (user is not yet a trip member)
  const { data: inviteResult, error: inviteError } = await supabase.rpc('get_invite_by_code', {
    p_code: code,
  });

  if (inviteError || !inviteResult) {
    return { error: 'Convite não encontrado' };
  }

  const invite = inviteResult as unknown as TripInvite;

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

  // Try to link an existing guest participant to this user (by email match)
  if (authUser.email) {
    await supabase.rpc('link_guest_to_user', {
      p_trip_id: invite.trip_id,
      p_user_id: authUser.id,
      p_user_email: authUser.email,
    });
    // If a guest was linked, the trigger ON CONFLICT DO NOTHING handles the duplicate
  }

  // Add user to trip as participant
  const { error: memberError } = await supabase.from('trip_members').insert({
    trip_id: invite.trip_id,
    user_id: authUser.id,
    role: 'participant',
    invited_by: invite.invited_by,
  });

  if (memberError) {
    return { error: 'Erro ao entrar na viagem' };
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
    logError(updateError, { action: 'mark-invite-accepted', tripId: invite.trip_id });
  }

  revalidate.tripParticipants(invite.trip_id);

  logActivity({
    tripId: invite.trip_id,
    action: 'accepted',
    entityType: 'invite',
    entityId: invite.id,
  });

  return { success: true, tripId: invite.trip_id };
}

export type EmailInviteResult = {
  error?: string;
  success?: boolean;
  invite?: TripInvite;
};

/**
 * Sends an email invitation to join a trip
 */
export async function sendEmailInvite(tripId: string, email: string): Promise<EmailInviteResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: 'Nao autorizado' };
  }

  // Check if user is a member of the trip
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', authUser.id)
    .single();

  if (!member) {
    return { error: 'Voce nao e membro desta viagem' };
  }

  // Get trip details
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, name, destination, start_date, end_date')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return { error: 'Viagem nao encontrada' };
  }

  // Get inviter details
  const { data: inviter, error: inviterError } = await supabase
    .from('users')
    .select('name')
    .eq('id', authUser.id)
    .single();

  if (inviterError || !inviter) {
    return { error: 'Erro ao obter dados do usuario' };
  }

  // Check if there's already a pending invite for this email in this trip
  const now = new Date().toISOString();
  const { data: existingInvite } = await supabase
    .from('trip_invites')
    .select('id, code')
    .eq('trip_id', tripId)
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', now)
    .single();

  let inviteCode: string;
  let invite: TripInvite;

  if (existingInvite) {
    // Resend the existing invite
    inviteCode = existingInvite.code;
    const { data: fullInvite } = await supabase
      .from('trip_invites')
      .select('*')
      .eq('id', existingInvite.id)
      .single();
    invite = fullInvite as TripInvite;
  } else {
    // Generate new invite code
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
      return { error: 'Erro ao gerar codigo de convite. Tente novamente.' };
    }

    inviteCode = code;

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_INVITE_EXPIRATION_DAYS);

    // Create the invite
    const { data: newInvite, error: insertError } = await supabase
      .from('trip_invites')
      .insert({
        trip_id: tripId,
        code: inviteCode,
        email: email.toLowerCase(),
        invited_by: authUser.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return { error: 'Erro ao criar convite por email' };
    }

    invite = newInvite;
  }

  // Send the email using centralized service
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}${routes.invite(inviteCode)}`;

  const formatDate = (dateString: string) => {
    return format(parseDateOnly(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Look up the recipient's user ID to generate a correct unsubscribe URL
  const { data: recipientUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  const recipientUserId = recipientUser?.id;

  // Only include unsubscribe URL if the recipient has an account
  const unsubscribeUrl = recipientUserId
    ? getUnsubscribeFooterUrl(recipientUserId, email.toLowerCase(), 'invite')
    : undefined;

  const emailHtml = await render(
    InviteEmail({
      inviteUrl,
      tripName: trip.name,
      tripDestination: trip.destination,
      tripStartDate: formatDate(trip.start_date),
      tripEndDate: formatDate(trip.end_date),
      inviterName: inviter.name,
      recipientEmail: email.toLowerCase(),
      unsubscribeUrl,
    })
  );

  const result = await sendEmail({
    emailType: 'invite',
    recipientEmail: email.toLowerCase(),
    recipientUserId,
    subject: `Convite para viagem: ${trip.name}`,
    htmlContent: emailHtml,
    metadata: { trip_id: tripId, invite_code: inviteCode, inviter_id: authUser.id },
    checkPreferences: false,
  });

  if (!result.success) {
    logError(result.error, { action: 'send-invite-email', tripId });
    revalidate.trip(tripId);
    return {
      error: 'Erro ao enviar o email de convite. O convite foi criado, tente reenviar.',
      invite,
    };
  }

  revalidate.trip(tripId);

  return { success: true, invite };
}

/**
 * Gets email invites for a trip (separate from link invites)
 */
export async function getEmailInvites(tripId: string): Promise<TripInviteWithInviter[]> {
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
    .not('email', 'is', null)
    .is('accepted_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  return (invites as TripInviteWithInviter[]) || [];
}

/**
 * Gets all pending invites for a trip (both link and email invites)
 */
export async function getAllPendingInvites(tripId: string): Promise<TripInviteWithInviter[]> {
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
