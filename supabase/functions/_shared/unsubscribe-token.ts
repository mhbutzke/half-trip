export interface UnsubscribeTokenPayload {
  userId: string;
  emailType: 'invite' | 'trip_reminder' | 'daily_summary' | 'welcome' | 'all';
  email: string;
}

async function generateHmacSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateUnsubscribeToken(payload: UnsubscribeTokenPayload): Promise<string> {
  const secret = Deno.env.get('UNSUBSCRIBE_SECRET') || 'change-me-in-production';
  const data = JSON.stringify(payload);
  const signature = await generateHmacSignature(data, secret);
  const encoder = new TextEncoder();
  const encodedData = btoa(String.fromCharCode(...encoder.encode(data)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${encodedData}.${signature}`;
}

export async function generateUnsubscribeUrl(
  payload: UnsubscribeTokenPayload,
  baseUrl?: string
): Promise<string> {
  const token = await generateUnsubscribeToken(payload);
  const url = baseUrl || Deno.env.get('APP_URL') || 'https://halftrip.app';
  return `${url}/unsubscribe?token=${token}`;
}
