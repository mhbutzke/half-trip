'use server';

import { createClient } from './server';
import { createAdminClient } from './admin';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { cache } from 'react';
import { sendPasswordResetEmail } from '@/lib/email/send-password-reset-email';
import { sendConfirmationEmail } from '@/lib/email/send-confirmation-email';
import { routes } from '@/lib/routes';
import { logError } from '@/lib/errors/logger';
import { rateLimit } from '@/lib/utils/rate-limit';

export type AuthResult = {
  error?: string;
  success?: boolean;
  userId?: string;
  requiresConfirmation?: boolean;
};

function getAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || null;
  if (!raw) return null;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

/**
 * Gets client IP for rate limiting. Falls back to 'unknown' if not available.
 */
async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  // Rate limit: 5 signups per IP per 15 minutes
  const ip = await getClientIp();
  const rl = rateLimit(`signup:${ip}`, { limit: 5, windowSeconds: 900 });
  if (!rl.success) {
    return { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' };
  }

  const adminClient = createAdminClient();

  // Create user WITHOUT confirming email (requires confirmation via link)
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name },
  });

  if (error) {
    if (
      error.message.includes('already registered') ||
      error.message.includes('already been registered')
    ) {
      return { error: 'Este email já está cadastrado' };
    }
    if (error.message.toLowerCase().includes('rate limit')) {
      return { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' };
    }
    return { error: 'Erro ao criar conta. Tente novamente.' };
  }

  if (!data?.user) {
    return { error: 'Erro ao criar conta. Tente novamente.' };
  }

  // Generate confirmation link and send email
  const appUrl = getAppUrl();
  if (appUrl) {
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
    });

    if (!linkError && linkData?.properties?.hashed_token) {
      const callbackParams = new URLSearchParams({
        token_hash: linkData.properties.hashed_token,
        type: 'signup',
      });
      const confirmUrl = `${appUrl}/auth/callback?${callbackParams.toString()}`;

      const emailResult = await sendConfirmationEmail({
        userName: name,
        userEmail: email,
        confirmUrl,
      });

      if (!emailResult.success) {
        logError(emailResult.error, {
          action: 'send-confirmation-email',
          userId: data.user.id,
        });
      }
    } else if (linkError) {
      logError(linkError, { action: 'generate-confirmation-link', userId: data.user.id });
    }
  }

  // Do NOT auto-login — user must confirm email first
  return { success: true, userId: data.user.id, requiresConfirmation: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  // Rate limit: 10 login attempts per IP per 15 minutes
  const ip = await getClientIp();
  const rl = rateLimit(`signin:${ip}`, { limit: 10, windowSeconds: 900 });
  if (!rl.success) {
    return { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email ou senha incorretos' };
    }
    if (error.message.includes('Email not confirmed')) {
      return {
        error: 'Por favor, confirme seu email antes de fazer login',
        requiresConfirmation: true,
      };
    }
    return { error: 'Erro ao fazer login. Tente novamente.' };
  }

  // Check if user is blocked
  if (data?.user) {
    const { data: profile } = await supabase
      .from('users')
      .select('blocked_at')
      .eq('id', data.user.id)
      .single();

    if (profile?.blocked_at) {
      await supabase.auth.signOut();
      return { error: 'Sua conta foi suspensa. Entre em contato com o suporte.' };
    }
  }

  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.login());
}

export async function forgotPassword(email: string): Promise<AuthResult> {
  // Rate limit: 3 password reset attempts per IP per 15 minutes
  const ip = await getClientIp();
  const rl = rateLimit(`forgot:${ip}`, { limit: 3, windowSeconds: 900 });
  if (!rl.success) {
    // Return success to not reveal rate limiting (same as "email not found" pattern)
    return { success: true };
  }

  const adminClient = createAdminClient();
  const appUrl = getAppUrl();
  if (!appUrl) {
    // Avoid leaking whether a user exists if reset isn't configured.
    return { success: true };
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      return { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' };
    }
    // Don't reveal if email exists or not
    return { success: true };
  }

  if (!data?.properties?.hashed_token) {
    return { success: true };
  }

  const callbackParams = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: 'recovery',
  });
  const resetUrl = `${appUrl}/auth/callback?${callbackParams.toString()}`;

  const emailResult = await sendPasswordResetEmail({
    userEmail: email,
    resetUrl,
  });

  if (!emailResult.success) {
    logError(emailResult.error, { action: 'send-password-reset-email', email });
  }

  // Always return success to not reveal if email exists
  return { success: true };
}

export async function resetPassword(password: string): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: 'Erro ao redefinir senha. Tente novamente.' };
  }

  return { success: true };
}

export async function resendConfirmation(email: string): Promise<AuthResult> {
  // Rate limit: 3 resend attempts per IP per 15 minutes
  const ip = await getClientIp();
  const rl = rateLimit(`resend-confirm:${ip}`, { limit: 3, windowSeconds: 900 });
  if (!rl.success) {
    return { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' };
  }

  const adminClient = createAdminClient();
  const appUrl = getAppUrl();

  if (!appUrl) {
    return { success: true };
  }

  // Generate a new confirmation link via magiclink (doesn't require password)
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    // Don't reveal if email exists or not
    return { success: true };
  }

  // Get user name for personalized email
  const { data: userData } = await adminClient
    .from('users')
    .select('name')
    .eq('email', email)
    .single();

  const callbackParams = new URLSearchParams({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  const confirmUrl = `${appUrl}/auth/callback?${callbackParams.toString()}`;

  const emailResult = await sendConfirmationEmail({
    userName: userData?.name || '',
    userEmail: email,
    confirmUrl,
  });

  if (!emailResult.success) {
    logError(emailResult.error, { action: 'resend-confirmation-email', email });
  }

  return { success: true };
}

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
