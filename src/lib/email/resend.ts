import { Resend } from 'resend';
import { logWarning } from '@/lib/errors/logger';

// Lazy initialization to avoid errors when RESEND_API_KEY is not set
let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    logWarning('RESEND_API_KEY is not set. Email functionality is disabled.', {
      action: 'resend-init',
    });
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}
