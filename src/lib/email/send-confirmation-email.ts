'use server';

import { render } from '@react-email/components';
import { ConfirmationEmail } from './confirmation-email';
import { sendEmail } from './service';
import type { SendEmailResult } from '@/types/email';

export async function sendConfirmationEmail(params: {
  userName: string;
  userEmail: string;
  confirmUrl: string;
}): Promise<SendEmailResult> {
  const { userName, userEmail, confirmUrl } = params;

  const emailHtml = await render(ConfirmationEmail({ userName, confirmUrl }));

  return sendEmail({
    emailType: 'confirmation',
    recipientEmail: userEmail,
    subject: 'Confirme seu email - Half Trip',
    htmlContent: emailHtml,
    checkPreferences: false,
  });
}
