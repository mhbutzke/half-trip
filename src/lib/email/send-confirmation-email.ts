'use server';

import { render } from '@react-email/components';
import { ConfirmationEmail } from './confirmation-email';
import { sendEmail } from './service';
import type { SendEmailResult } from '@/types/email';

export async function sendConfirmationEmail(params: {
  userId: string;
  userName: string;
  userEmail: string;
  confirmationUrl: string;
}): Promise<SendEmailResult> {
  const { userId, userName, userEmail, confirmationUrl } = params;

  const emailHtml = await render(
    ConfirmationEmail({
      userName,
      confirmationUrl,
    })
  );

  return sendEmail({
    emailType: 'confirmation',
    recipientEmail: userEmail,
    recipientUserId: userId,
    subject: 'Confirme seu email - Half Trip',
    htmlContent: emailHtml,
    metadata: { user_id: userId },
    checkPreferences: false,
  });
}
