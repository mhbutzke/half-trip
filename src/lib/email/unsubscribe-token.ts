import crypto from 'crypto';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'change-me-in-production';

export interface UnsubscribeTokenPayload {
  userId: string;
  emailType: 'invite' | 'trip_reminder' | 'daily_summary' | 'welcome' | 'all';
  email: string;
}

export function generateUnsubscribeToken(payload: UnsubscribeTokenPayload): string {
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');
  const encodedData = Buffer.from(data).toString('base64url');
  return `${encodedData}.${signature}`;
}

export function verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  try {
    const [encodedData, signature] = token.split('.');
    if (!encodedData || !signature) return null;

    const data = Buffer.from(encodedData, 'base64url').toString('utf-8');

    const hmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) return null;

    return JSON.parse(data) as UnsubscribeTokenPayload;
  } catch {
    return null;
  }
}

export function generateUnsubscribeUrl(payload: UnsubscribeTokenPayload, baseUrl?: string): string {
  const token = generateUnsubscribeToken(payload);
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${url}/unsubscribe?token=${token}`;
}

export function getUnsubscribeFooterUrl(
  userId: string,
  email: string,
  emailType: UnsubscribeTokenPayload['emailType']
): string {
  return generateUnsubscribeUrl({ userId, email, emailType });
}
