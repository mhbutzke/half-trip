import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    // Find active trips (today is between start_date and end_date)
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

    for (const trip of trips) {
      // Get today's expenses
      const { data: todayExpenses } = await supabase
        .from('expenses')
        .select('amount, exchange_rate, description, paid_by, users!expenses_paid_by_fkey(name)')
        .eq('trip_id', trip.id)
        .eq('date', today);

      // Get tomorrow's activities
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

      // Only send if there's something to report
      if ((todayExpenses || []).length === 0 && (tomorrowActivities || []).length === 0) continue;

      // Build email HTML
      const expenseLines = (todayExpenses || [])
        .map(
          (e: {
            description: string;
            amount: number;
            exchange_rate: number | null;
            users: { name: string } | null;
          }) =>
            `<li>${e.description} - ${formatCurrency(e.amount * (e.exchange_rate || 1), trip.base_currency)} (${e.users?.name || 'N/A'})</li>`
        )
        .join('');

      const activityLines = (tomorrowActivities || [])
        .map(
          (a: { title: string; start_time: string | null; location: string | null }) =>
            `<li>${a.start_time ? a.start_time.slice(0, 5) + ' - ' : ''}${a.title}${a.location ? ' (' + a.location + ')' : ''}</li>`
        )
        .join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="background-color:#fff;margin:0 auto;padding:20px 0 48px;max-width:600px;">
  <div style="padding:24px 40px;"><h1 style="color:#0d9488;font-size:28px;font-weight:700;margin:0;text-align:center;">Half Trip</h1></div>
  <div style="padding:0 40px;">
    <h1 style="color:#1f2937;font-size:22px;margin:0 0 16px;">Resumo do dia - ${trip.name}</h1>

    ${
      (todayExpenses || []).length > 0
        ? `
    <h3 style="color:#1f2937;font-size:16px;margin:20px 0 8px;">Gastos de hoje</h3>
    <ul style="color:#374151;font-size:14px;padding-left:20px;">${expenseLines}</ul>
    <p style="color:#0d9488;font-size:16px;font-weight:600;">Total: ${formatCurrency(todayTotal, trip.base_currency)}</p>
    `
        : ''
    }

    ${
      (tomorrowActivities || []).length > 0
        ? `
    <h3 style="color:#1f2937;font-size:16px;margin:20px 0 8px;">Atividades de amanha</h3>
    <ul style="color:#374151;font-size:14px;padding-left:20px;">${activityLines}</ul>
    `
        : ''
    }

    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/trip/${trip.id}" style="background-color:#0d9488;border-radius:6px;color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 24px;display:inline-block;">Ver viagem</a>
    </div>
  </div>
  <hr style="border-color:#e5e7eb;margin:32px 40px;" />
  <div style="padding:0 40px;"><p style="color:#9ca3af;font-size:12px;text-align:center;">halftrip.com</p></div>
</div></body></html>`;

      // Send to each member
      for (const member of trip.trip_members || []) {
        const user = (member as { users: { id: string; name: string; email: string } | null })
          .users;
        if (!user?.email) continue;

        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Half Trip <resumo@halftrip.com>',
              to: user.email,
              subject: `Resumo do dia - ${trip.name}`,
              html,
            }),
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to send to ${user.email}:`, err);
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
