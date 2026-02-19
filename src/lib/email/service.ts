'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from './resend';
import type { EmailType, SendEmailParams, SendEmailResult } from '@/types/email';
import type { Json } from '@/types/database';
import { logError, logWarning } from '@/lib/errors/logger';

const FROM_ADDRESSES: Record<EmailType, string> = {
  invite: 'Half Trip <convites@halftrip.com>',
  trip_reminder: 'Half Trip <lembretes@halftrip.com>',
  daily_summary: 'Half Trip <resumo@halftrip.com>',
  welcome: 'Half Trip <boas-vindas@halftrip.com>',
  confirmation: 'Half Trip <confirme@halftrip.com>',
  password_reset: 'Half Trip <seguranca@halftrip.com>',
};

const SANDBOX_FROM_ADDRESS = 'Half Trip <onboarding@resend.dev>';

const PREFERENCE_COLUMN_MAP: Record<EmailType, string> = {
  invite: 'invite_emails',
  trip_reminder: 'trip_reminder_emails',
  daily_summary: 'daily_summary_emails',
  welcome: 'welcome_emails',
  confirmation: 'welcome_emails',
  password_reset: 'welcome_emails',
};

async function checkUserEmailPreference(userId: string, emailType: EmailType): Promise<boolean> {
  const adminClient = createAdminClient();
  const column = PREFERENCE_COLUMN_MAP[emailType];

  const { data } = await adminClient
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
  try {
    const adminClient = createAdminClient();

    await adminClient.from('email_logs').insert({
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
  } catch (err) {
    logError(err, { action: 'log-email-attempt', emailType: params.emailType });
  }
}

function isUnverifiedDomainError(errorMessage: string | undefined): boolean {
  return /domain is not verified/i.test(errorMessage || '');
}

type SendAttemptResult = {
  data: { id?: string } | null;
  error: { message?: string } | null;
  fromAddress: string;
};

async function sendWithDomainFallback(params: {
  resend: NonNullable<ReturnType<typeof getResendClient>>;
  fromAddress: string;
  recipientEmail: string;
  subject: string;
  htmlContent: string;
}): Promise<SendAttemptResult> {
  const { resend, fromAddress, recipientEmail, subject, htmlContent } = params;

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: recipientEmail,
    subject,
    html: htmlContent,
  });

  if (!error || fromAddress === SANDBOX_FROM_ADDRESS || !isUnverifiedDomainError(error.message)) {
    return { data, error, fromAddress };
  }

  logWarning('Primary sender domain is not verified. Trying sandbox sender.', {
    action: 'send-email-domain-fallback',
    fromAddress,
    fallbackFromAddress: SANDBOX_FROM_ADDRESS,
    recipientEmail,
  });

  const { data: fallbackData, error: fallbackError } = await resend.emails.send({
    from: SANDBOX_FROM_ADDRESS,
    to: recipientEmail,
    subject,
    html: htmlContent,
  });

  return {
    data: fallbackData,
    error: fallbackError,
    fromAddress: SANDBOX_FROM_ADDRESS,
  };
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
    await logEmailAttempt({
      emailType,
      recipientEmail,
      recipientUserId,
      subject,
      fromAddress: FROM_ADDRESSES[emailType],
      status: 'failed',
      errorMessage: 'RESEND_API_KEY not configured',
      metadata,
    });
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
    const firstAttempt = await sendWithDomainFallback({
      resend,
      fromAddress,
      recipientEmail,
      subject,
      htmlContent,
    });

    if (firstAttempt.error) {
      logError(firstAttempt.error, { action: 'resend-send', emailType, recipientEmail });

      await logEmailAttempt({
        emailType,
        recipientEmail,
        recipientUserId,
        subject,
        fromAddress: firstAttempt.fromAddress,
        status: 'failed',
        errorMessage: firstAttempt.error.message || 'Unknown error',
        metadata,
      });

      // Quick retry after short delay (avoid blocking server action for too long)
      await new Promise((resolve) => setTimeout(resolve, 2_000));

      const retryAttempt = await sendWithDomainFallback({
        resend,
        fromAddress,
        recipientEmail,
        subject,
        htmlContent,
      });

      if (retryAttempt.error) {
        await logEmailAttempt({
          emailType,
          recipientEmail,
          recipientUserId,
          subject,
          fromAddress: retryAttempt.fromAddress,
          status: 'failed',
          errorMessage: retryAttempt.error.message || 'Retry failed',
          metadata,
          retryCount: 1,
        });
        return { success: false, error: retryAttempt.error.message || 'Failed after retry' };
      }

      await logEmailAttempt({
        emailType,
        recipientEmail,
        recipientUserId,
        subject,
        fromAddress: retryAttempt.fromAddress,
        resendEmailId: retryAttempt.data?.id,
        status: 'sent',
        metadata,
        retryCount: 1,
      });

      return { success: true, emailId: retryAttempt.data?.id };
    }

    await logEmailAttempt({
      emailType,
      recipientEmail,
      recipientUserId,
      subject,
      fromAddress: firstAttempt.fromAddress,
      resendEmailId: firstAttempt.data?.id,
      status: 'sent',
      metadata,
    });

    return { success: true, emailId: firstAttempt.data?.id };
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
