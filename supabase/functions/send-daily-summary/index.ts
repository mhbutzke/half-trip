import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { generateBaseEmailHtml, emailStyles } from '../_shared/base-html-template.ts';
import { dispatchDailySummaryEmail } from '../_shared/email-dispatch.ts';
import { generateUnsubscribeUrl } from '../_shared/unsubscribe-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'https://halftrip.com';

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0];

    const { data: trips } = await supabase
      .from('trips')
      .select(
        `
        id, name, destination, base_currency, start_date, end_date,
        trip_members ( user_id, users ( id, name, email ) )
      `
      )
      .lte('start_date', today)
      .gte('end_date', today)
      .is('archived_at', null);

    if (!trips || trips.length === 0) {
      return new Response(JSON.stringify({ message: 'No active trips', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;
    const formatCurrency = (v: number, c: string) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c }).format(v);

    const s = emailStyles;

    for (const trip of trips) {
      const { data: todayExpenses } = await supabase
        .from('expenses')
        .select('amount, exchange_rate, description, paid_by, users!expenses_paid_by_fkey(name)')
        .eq('trip_id', trip.id)
        .eq('date', today);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data: tomorrowActivities } = await supabase
        .from('activities')
        .select('title, start_time, location')
        .eq('trip_id', trip.id)
        .eq('date', tomorrowStr)
        .order('start_time', { ascending: true });

      const todayTotal = (todayExpenses || []).reduce(
        (sum: number, e: { amount: number; exchange_rate: number | null }) =>
          sum + e.amount * (e.exchange_rate || 1),
        0
      );

      if ((todayExpenses || []).length === 0 && (tomorrowActivities || []).length === 0) continue;

      // Build body HTML
      const expenseLines = (todayExpenses || [])
        .map((e) => {
          const paidByRaw = (e as Record<string, unknown>).users;
          const paidBy = Array.isArray(paidByRaw)
            ? (paidByRaw[0] as { name?: string } | undefined)
            : (paidByRaw as { name?: string } | null);

          return `<li>${e.description} - ${formatCurrency(e.amount * (e.exchange_rate || 1), trip.base_currency)} (${paidBy?.name || 'N/A'})</li>`;
        })
        .join('');

      const activityLines = (tomorrowActivities || [])
        .map(
          (a: { title: string; start_time: string | null; location: string | null }) =>
            `<li>${a.start_time ? a.start_time.slice(0, 5) + ' - ' : ''}${a.title}${a.location ? ' (' + a.location + ')' : ''}</li>`
        )
        .join('');

      const bodyHtml = `${
        (todayExpenses || []).length > 0
          ? `<h3 style="${s.subheading}">Gastos de hoje</h3>
<ul style="color:#374151;font-size:14px;padding-left:20px;">${expenseLines}</ul>
<p style="color:#0d9488;font-size:16px;font-weight:600;">Total: ${formatCurrency(todayTotal, trip.base_currency)}</p>`
          : ''
      }
${
  (tomorrowActivities || []).length > 0
    ? `<h3 style="${s.subheading}">Atividades de amanhã</h3>
<ul style="color:#374151;font-size:14px;padding-left:20px;">${activityLines}</ul>`
    : ''
}
<div style="${s.buttonContainer}">
  <a href="${appUrl}/trip/${trip.id}" style="${s.button}">Ver viagem</a>
</div>`;

      const subject = `Resumo do dia - ${trip.name}`;

      for (const member of trip.trip_members || []) {
        const userRaw = (member as Record<string, unknown>).users;
        const user = (Array.isArray(userRaw) ? userRaw[0] : userRaw) as {
          id?: string;
          name?: string;
          email?: string;
        } | null;
        if (!user?.email) continue;
        if (!user.id) continue;

        // Check user preferences
        const { data: prefs } = await supabase
          .from('user_email_preferences')
          .select('daily_summary_emails')
          .eq('user_id', user.id)
          .single();

        if (prefs && prefs.daily_summary_emails === false) {
          console.log(`User ${user.id} opted out of daily summaries`);
          continue;
        }

        const unsubscribeUrl = await generateUnsubscribeUrl(
          { userId: user.id, email: user.email, emailType: 'daily_summary' },
          appUrl
        );

        const html = generateBaseEmailHtml({
          previewText: `Resumo do dia - ${trip.name}`,
          heading: `Resumo do dia - ${trip.name}`,
          bodyHtml,
          unsubscribeUrl,
        });
        const result = await dispatchDailySummaryEmail({
          supabase,
          resendApiKey,
          recipientEmail: user.email,
          recipientUserId: user.id,
          subject,
          html,
          tripId: trip.id,
        });

        if (result.success) {
          sentCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sentCount} daily summaries`, sent: sentCount }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
