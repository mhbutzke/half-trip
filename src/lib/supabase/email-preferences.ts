'use server';

import { createClient } from './server';
import { createAdminClient } from './admin';
import { revalidatePath } from 'next/cache';
import type { UserEmailPreferences } from '@/types/email';
import type { UnsubscribeTokenPayload } from '@/lib/email/unsubscribe-token';

export async function getUserEmailPreferences(): Promise<UserEmailPreferences | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: prefs } = await supabase
    .from('user_email_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!prefs) {
    const { data: newPrefs, error } = await supabase
      .from('user_email_preferences')
      .insert({ user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating default email preferences:', error);
      return null;
    }

    return mapPreferences(newPrefs);
  }

  return mapPreferences(prefs);
}

export async function updateUserEmailPreferences(updates: {
  inviteEmails?: boolean;
  tripReminderEmails?: boolean;
  dailySummaryEmails?: boolean;
  welcomeEmails?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autorizado' };
  }

  const dbUpdates: Record<string, boolean> = {};
  if (updates.inviteEmails !== undefined) dbUpdates.invite_emails = updates.inviteEmails;
  if (updates.tripReminderEmails !== undefined)
    dbUpdates.trip_reminder_emails = updates.tripReminderEmails;
  if (updates.dailySummaryEmails !== undefined)
    dbUpdates.daily_summary_emails = updates.dailySummaryEmails;
  if (updates.welcomeEmails !== undefined) dbUpdates.welcome_emails = updates.welcomeEmails;

  // Ensure preferences row exists
  const { data: existing } = await supabase
    .from('user_email_preferences')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    const { error } = await supabase
      .from('user_email_preferences')
      .insert({ user_id: user.id, ...dbUpdates });

    if (error) {
      console.error('Error creating email preferences:', error);
      return { success: false, error: 'Erro ao salvar preferências' };
    }
  } else {
    const { error } = await supabase
      .from('user_email_preferences')
      .update(dbUpdates)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating email preferences:', error);
      return { success: false, error: 'Erro ao atualizar preferências' };
    }
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function unsubscribeFromEmail(
  payload: UnsubscribeTokenPayload
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', payload.email)
    .single();

  if (!user) {
    return { success: false, error: 'Usuário não encontrado' };
  }

  const update: Record<string, boolean> = {};

  if (payload.emailType === 'all') {
    update.invite_emails = false;
    update.trip_reminder_emails = false;
    update.daily_summary_emails = false;
    update.welcome_emails = false;
  } else {
    const columnMap: Record<string, string> = {
      invite: 'invite_emails',
      trip_reminder: 'trip_reminder_emails',
      daily_summary: 'daily_summary_emails',
      welcome: 'welcome_emails',
    };
    const column = columnMap[payload.emailType];
    if (column) update[column] = false;
  }

  const { data: existing } = await supabase
    .from('user_email_preferences')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    const { error } = await supabase
      .from('user_email_preferences')
      .insert({ user_id: user.id, ...update });

    if (error) {
      console.error('Error creating email preferences for unsubscribe:', error);
      return { success: false, error: 'Erro ao salvar preferências' };
    }
  } else {
    const { error } = await supabase
      .from('user_email_preferences')
      .update(update)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating email preferences for unsubscribe:', error);
      return { success: false, error: 'Erro ao atualizar preferências' };
    }
  }

  return { success: true };
}

function mapPreferences(prefs: Record<string, unknown>): UserEmailPreferences {
  return {
    id: prefs.id as string,
    userId: prefs.user_id as string,
    inviteEmails: prefs.invite_emails as boolean,
    tripReminderEmails: prefs.trip_reminder_emails as boolean,
    dailySummaryEmails: prefs.daily_summary_emails as boolean,
    welcomeEmails: prefs.welcome_emails as boolean,
    createdAt: prefs.created_at as string,
    updatedAt: prefs.updated_at as string,
  };
}
