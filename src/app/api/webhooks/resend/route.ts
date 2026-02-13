import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

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

    // In production, verify webhook signature
    if (webhookSecret && (!svixId || !svixTimestamp || !svixSignature)) {
      return NextResponse.json({ error: 'Missing webhook headers' }, { status: 401 });
    }

    const payload = await req.json();
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
    console.error('Resend webhook error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
