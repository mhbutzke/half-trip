import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { Database } from '@/types/database';
import { logError } from '@/lib/errors/logger';

function verifyWebhookSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): boolean {
  // Resend/Svix signs with: base64(HMAC-SHA256(secret, "${msgId}.${timestamp}.${body}"))
  // The secret is prefixed with "whsec_" followed by base64-encoded key
  const secretBytes = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const toSign = `${svixId}.${svixTimestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(toSign)
    .digest('base64');

  // svix-signature can contain multiple signatures separated by spaces (versioned: "v1,<sig>")
  const signatures = svixSignature.split(' ');
  const expectedBuf = Buffer.from(expectedSignature);
  for (const sig of signatures) {
    const [version, value] = sig.split(',');
    if (version === 'v1' && value) {
      const valueBuf = Buffer.from(value);
      if (expectedBuf.length === valueBuf.length && crypto.timingSafeEqual(expectedBuf, valueBuf)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Resend webhook handler.
 * Receives delivery events and updates email_logs.
 */
export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing webhook headers' }, { status: 401 });
    }

    const body = await req.text();

    // Verify webhook signature (required in production)
    if (!webhookSecret && process.env.NODE_ENV === 'production') {
      logError('RESEND_WEBHOOK_SECRET not configured in production', { action: 'resend-webhook' });
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    if (webhookSecret) {
      // Reject timestamps older than 5 minutes to prevent replay attacks
      const timestampSeconds = parseInt(svixTimestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (isNaN(timestampSeconds) || Math.abs(now - timestampSeconds) > 300) {
        return NextResponse.json({ error: 'Invalid timestamp' }, { status: 401 });
      }

      if (!verifyWebhookSignature(body, svixId, svixTimestamp, svixSignature, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const eventType: string = payload.type;
    const emailId: string | undefined = payload.data?.email_id;

    if (!emailId) {
      return NextResponse.json({ error: 'Missing email ID' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    switch (eventType) {
      case 'email.sent':
        updates.status = 'sent';
        break;
      case 'email.delivered':
        updates.status = 'delivered';
        updates.delivered_at = new Date().toISOString();
        break;
      case 'email.delivery_delayed':
        // Don't change status, just note it
        break;
      case 'email.bounced':
        updates.status = 'bounced';
        updates.bounced_at = new Date().toISOString();
        updates.error_message = payload.data?.bounce_type || 'Email bounced';
        break;
      case 'email.complained':
        updates.status = 'complained';
        updates.complained_at = new Date().toISOString();
        break;
      case 'email.opened':
        updates.opened_at = new Date().toISOString();
        break;
      default:
        // Unknown event, still return 200 to avoid retries
        return NextResponse.json({ received: true });
    }

    await supabase.from('email_logs').update(updates).eq('resend_email_id', emailId);

    return NextResponse.json({ received: true });
  } catch (err) {
    logError(err, { action: 'resend-webhook' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
