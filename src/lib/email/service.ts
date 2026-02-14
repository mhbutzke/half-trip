'use server';

import { createClient } from '@/lib/supabase/server';
import { getResendClient } from './resend';
import type { EmailType, SendEmailParams, SendEmailResult } from '@/types/email';
import type { Json } from '@/types/database';
import { logError } from '@/lib/errors/logger';

const FROM_ADDRESSES: Record<EmailType, string> = {
  invite: 'Half Trip <convites@halftrip.com>',
  trip_reminder: 'Half Trip <lembretes@halftrip.com>',
  daily_summary: 'Half Trip <resumo@halftrip.com>',
  welcome: 'Half Trip <boas-vindas@halftrip.com>',
  confirmation: 'Half Trip <confirme@halftrip.com>',
};

const PREFERENCE_COLUMN_MAP: Record<EmailType, string> = {
  invite: 'invite_emails',
  trip_reminder: 'trip_reminder_emails',
  daily_summary: 'daily_summary_emails',
  welcome: 'welcome_emails',
  confirmation: 'welcome_emails',
};

async function checkUserEmailPreference(userId: string, emailType: EmailType): Promise<boolean> {
  const supabase = await createClient();
  const column = PREFERENCE_COLUMN_MAP[emailType];

  const { data } = await supabase
    .from('user_email_preferences')
    .select(column)
    .eq('user_id', userId)
    .single();

  if (!data) return true;
  const preferences = data as unknown as Record<string, boolean | null | undefined>;
  return preferences[column] ?? true;
}

async function logEmailAttempt(params: {
  emailType: EmailType;
  recipientEmail: string;
  recipientUserId?: string;
  subject: string;
  fromAddress: string;
  resendEmailId?: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  retryCount?: number;
}): Promise<void> {
  const supabase = await createClient();

  await supabase.from('email_logs').insert({
    email_type: params.emailType,
    recipient_email: params.recipientEmail,
    recipient_user_id: params.recipientUserId || null,
    subject: params.subject,
    from_address: params.fromAddress,
    resend_email_id: params.resendEmailId || null,
    status: params.status,
    error_message: params.errorMessage || null,
    metadata: (params.metadata || {}) as Json,
    retry_count: params.retryCount || 0,
  });
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const {
    emailType,
    recipientEmail,
    recipientUserId,
    subject,
    htmlContent,
    metadata = {},
    checkPreferences = true,
  } = params;

  const resend = getResendClient();
  if (!resend) {
    logError('Resend client not configured', { action: 'send-email' });
    return { success: false, error: 'Email service not configured' };
  }

  if (checkPreferences && recipientUserId) {
    const hasOptedIn = await checkUserEmailPreference(recipientUserId, emailType);
    if (!hasOptedIn) {
      return { success: false, error: 'User has opted out of this email type' };
    }
  }

  const fromAddress = FROM_ADDRESSES[emailType];

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: recipientEmail,
      subject,
      html: htmlContent,
    });

    if (error) {
      logError(error, { action: 'resend-send', emailType, recipientEmail });

      await logEmailAttempt({
        emailType,
        recipientEmail,
        recipientUserId,
        subject,
        fromAddress,
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
        metadata,
      });

      // Simple retry after delay
      await new Promise((resolve) => setTimeout(resolve, 30_000));

      const { data: retryData, error: retryError } = await resend.emails.send({
        from: fromAddress,
        to: recipientEmail,
        subject,
        html: htmlContent,
      });

      if (retryError) {
        await logEmailAttempt({
          emailType,
          recipientEmail,
          recipientUserId,
          subject,
          fromAddress,
          status: 'failed',
          errorMessage: retryError.message || 'Retry failed',
          metadata,
          retryCount: 1,
        });
        return { success: false, error: retryError.message || 'Failed after retry' };
      }

      await logEmailAttempt({
        emailType,
        recipientEmail,
        recipientUserId,
        subject,
        fromAddress,
        resendEmailId: retryData?.id,
        status: 'sent',
        metadata,
        retryCount: 1,
      });

      return { success: true, emailId: retryData?.id };
    }

    await logEmailAttempt({
      emailType,
      recipientEmail,
      recipientUserId,
      subject,
      fromAddress,
      resendEmailId: data?.id,
      status: 'sent',
      metadata,
    });

    return { success: true, emailId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logError(err, { action: 'email-send', emailType, recipientEmail });

    await logEmailAttempt({
      emailType,
      recipientEmail,
      recipientUserId,
      subject,
      fromAddress,
      status: 'failed',
      errorMessage,
      metadata,
    });

    return { success: false, error: errorMessage };
  }
}
