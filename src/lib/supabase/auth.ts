'use server';

import { createClient } from './server';
import { createAdminClient } from './admin';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { sendConfirmationEmail } from '@/lib/email/send-confirmation-email';
import { routes } from '@/lib/routes';
import { logError } from '@/lib/errors/logger';

export type AuthResult = {
  error?: string;
  success?: boolean;
  userId?: string;
  emailError?: boolean;
};

export async function signUp(
  name: string,
  email: string,
  password: string,
  redirectTo?: string
): Promise<AuthResult> {
  const adminClient = createAdminClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || '';

  // Use admin.generateLink to create user WITHOUT triggering Supabase's built-in
  // email system (which has strict rate limits on the free tier)
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: {
        name,
      },
    },
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
    return { error: error.message };
  }

  if (!data?.properties?.hashed_token || !data?.user) {
    return { error: 'Erro ao criar conta. Tente novamente.' };
  }

  // Build the confirmation URL that points to our auth callback
  const callbackParams = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: 'signup',
  });
  if (redirectTo) {
    callbackParams.set('redirect', redirectTo);
  }
  const confirmationUrl = `${origin}/auth/callback?${callbackParams.toString()}`;

  // Send confirmation email via Resend (bypasses Supabase rate limits)
  const emailResult = await sendConfirmationEmail({
    userId: data.user.id,
    userName: name,
    userEmail: email,
    confirmationUrl,
  });

  if (!emailResult.success) {
    logError(emailResult.error, { action: 'send-confirmation-email', userId: data.user.id });
    return {
      success: true,
      userId: data.user.id,
      emailError: true,
      error: 'Conta criada, mas houve um erro ao enviar o email de confirmação. Tente reenviar.',
    };
  }

  return { success: true, userId: data.user.id };
}

export async function resendConfirmationEmail(email: string, name: string): Promise<AuthResult> {
  const adminClient = createAdminClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || '';

  // Use magiclink type to regenerate a verification link for existing unconfirmed users
  // (signup type requires password and could change the user's existing password)
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      return { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' };
    }
    return { error: 'Erro ao reenviar email de confirmação.' };
  }

  if (!data?.properties?.hashed_token || !data?.user) {
    return { error: 'Erro ao gerar link de confirmação.' };
  }

  const callbackParams = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: 'magiclink',
  });
  const confirmationUrl = `${origin}/auth/callback?${callbackParams.toString()}`;

  const emailResult = await sendConfirmationEmail({
    userId: data.user.id,
    userName: name,
    userEmail: email,
    confirmationUrl,
  });

  if (!emailResult.success) {
    logError(emailResult.error, { action: 'resend-confirmation-email', userId: data.user.id });
    return { error: 'Erro ao enviar email de confirmação. Tente novamente.' };
  }

  return { success: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email ou senha incorretos' };
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Por favor, confirme seu email antes de fazer login' };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.login());
}

export async function forgotPassword(email: string): Promise<AuthResult> {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || '';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function resetPassword(password: string): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
