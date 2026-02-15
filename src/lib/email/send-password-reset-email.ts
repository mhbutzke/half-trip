'use server';

import { render } from '@react-email/components';
import { PasswordResetEmail } from './password-reset-email';
import { sendEmail } from './service';
import type { SendEmailResult } from '@/types/email';

export async function sendPasswordResetEmail(params: {
  userEmail: string;
  resetUrl: string;
}): Promise<SendEmailResult> {
  const { userEmail, resetUrl } = params;

  const emailHtml = await render(
    PasswordResetEmail({
      resetUrl,
    })
  );

  return sendEmail({
    emailType: 'password_reset',
    recipientEmail: userEmail,
    subject: 'Redefinir senha - Half Trip',
    htmlContent: emailHtml,
    checkPreferences: false,
  });
}
