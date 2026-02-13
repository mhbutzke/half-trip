'use server';

import { createClient } from './server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { sendWelcomeEmail } from '@/lib/email/send-welcome-email';

export type AuthResult = {
  error?: string;
  success?: boolean;
};

export async function signUp(
  name: string,
  email: string,
  password: string,
  redirectTo?: string
): Promise<AuthResult> {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || '';

  // Build the callback URL with optional redirect
  const callbackUrl = redirectTo
    ? `${origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
    : `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Este email já está cadastrado' };
    }
    return { error: error.message };
  }

  // Fire-and-forget welcome email (don't block signup)
  if (data.user?.id) {
    sendWelcomeEmail({ userId: data.user.id, userName: name, userEmail: email }).catch((err) =>
      console.error('Failed to send welcome email:', err)
    );
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
  redirect('/login');
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
