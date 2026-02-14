'use server';

import { render } from '@react-email/components';
import { WelcomeEmail } from './welcome-email';
import { sendEmail } from './service';
import { getUnsubscribeFooterUrl } from './unsubscribe-token';
import type { SendEmailResult } from '@/types/email';

export async function sendWelcomeEmail(params: {
  userId: string;
  userName: string;
  userEmail: string;
}): Promise<SendEmailResult> {
  const { userId, userName, userEmail } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginUrl = `${appUrl}/login`;

  const unsubscribeUrl = getUnsubscribeFooterUrl(userId, userEmail, 'welcome');

  const emailHtml = await render(
    WelcomeEmail({
      userName,
      loginUrl,
      unsubscribeUrl,
    })
  );

  return sendEmail({
    emailType: 'welcome',
    recipientEmail: userEmail,
    recipientUserId: userId,
    subject: 'Bem-vindo ao Half Trip!',
    htmlContent: emailHtml,
    metadata: { user_id: userId },
    checkPreferences: false,
  });
}
