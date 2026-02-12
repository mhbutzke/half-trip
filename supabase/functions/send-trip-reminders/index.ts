import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

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

    // Find trips starting in exactly 3 days (72h window)
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + 3);
    const dateStr = reminderDate.toISOString().split('T')[0];

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(
        `
        id, name, destination, start_date, end_date, base_currency,
        trip_members (
          user_id,
          users ( id, name, email )
        )
      `
      )
      .eq('start_date', dateStr)
      .is('archived_at', null);

    if (tripsError) throw tripsError;
    if (!trips || trips.length === 0) {
      return new Response(JSON.stringify({ message: 'No trips starting in 3 days', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;

    for (const trip of trips) {
      // Gather pending data per trip
      const [checklistResult, settlementResult, activitiesResult, budgetResult] = await Promise.all(
        [
          supabase
            .from('checklist_items')
            .select('id, trip_checklists!inner(trip_id)')
            .eq('trip_checklists.trip_id', trip.id)
            .eq('is_completed', false),
          supabase.from('settlements').select('id').eq('trip_id', trip.id).is('settled_at', null),
          supabase.from('activities').select('id').eq('trip_id', trip.id).is('start_time', null),
          supabase
            .from('trip_budgets')
            .select('amount')
            .eq('trip_id', trip.id)
            .eq('category', 'total')
            .single(),
        ]
      );

      let totalSpent = 0;
      if (budgetResult.data) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, exchange_rate')
          .eq('trip_id', trip.id);
        totalSpent = (expenses || []).reduce(
          (sum: number, e: { amount: number; exchange_rate: number | null }) =>
            sum + e.amount * (e.exchange_rate || 1),
          0
        );
      }

      const pendingItems = {
        incompleteChecklists: checklistResult.data?.length || 0,
        pendingSettlements: settlementResult.data?.length || 0,
        activitiesWithoutTime: activitiesResult.data?.length || 0,
      };

      const budgetSummary = budgetResult.data
        ? { spent: totalSpent, total: budgetResult.data.amount, currency: trip.base_currency }
        : null;

      const formattedDate = new Date(trip.start_date + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      // Send to each member
      for (const member of trip.trip_members || []) {
        const user = (member as Record<string, unknown>).users as {
          id: string;
          name: string;
          email: string;
        } | null;
        if (!user?.email) continue;

        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Half Trip <lembretes@halftrip.com>',
              to: user.email,
              subject: `${trip.name} começa em 3 dias!`,
              html: buildReminderHtml({
                userName: user.name,
                tripName: trip.name,
                tripDestination: trip.destination,
                startDate: formattedDate,
                daysUntil: 3,
                tripUrl: `${appUrl}/trip/${trip.id}`,
                pendingItems,
                budgetSummary,
              }),
            }),
          });
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${user.email}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sentCount} reminders`, sent: sentCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-trip-reminders:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Build a simple HTML email (Edge Functions can't use React Email directly).
 * Mirrors the TripReminderEmail React component's visual design.
 */
function buildReminderHtml(props: {
  userName: string;
  tripName: string;
  tripDestination: string;
  startDate: string;
  daysUntil: number;
  tripUrl: string;
  pendingItems: {
    incompleteChecklists: number;
    pendingSettlements: number;
    activitiesWithoutTime: number;
  };
  budgetSummary: { spent: number; total: number | null; currency: string } | null;
}): string {
  const {
    userName,
    tripName,
    tripDestination,
    startDate,
    tripUrl,
    pendingItems,
    budgetSummary,
    daysUntil,
  } = props;

  const pendingHtml: string[] = [];
  if (pendingItems.incompleteChecklists > 0)
    pendingHtml.push(
      `<p style="margin:0 0 8px;padding-left:8px;font-size:14px;color:#374151;">☐ ${pendingItems.incompleteChecklists} item(ns) de checklist incompleto(s)</p>`
    );
  if (pendingItems.pendingSettlements > 0)
    pendingHtml.push(
      `<p style="margin:0 0 8px;padding-left:8px;font-size:14px;color:#374151;">💰 ${pendingItems.pendingSettlements} acerto(s) pendente(s)</p>`
    );
  if (pendingItems.activitiesWithoutTime > 0)
    pendingHtml.push(
      `<p style="margin:0 0 8px;padding-left:8px;font-size:14px;color:#374151;">🕐 ${pendingItems.activitiesWithoutTime} atividade(s) sem horário</p>`
    );

  const pendingSection =
    pendingHtml.length > 0
      ? `<h3 style="color:#1f2937;font-size:16px;font-weight:600;margin:24px 0 8px;">Itens pendentes</h3>${pendingHtml.join('')}`
      : '';

  const formatCurrency = (v: number, c: string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c }).format(v);

  const budgetSection = budgetSummary?.total
    ? `<h3 style="color:#1f2937;font-size:16px;font-weight:600;margin:24px 0 8px;">Orçamento</h3>
       <p style="color:#374151;font-size:16px;margin:0 0 16px;">Gasto até agora: <strong>${formatCurrency(budgetSummary.spent, budgetSummary.currency)}</strong> de <strong>${formatCurrency(budgetSummary.total, budgetSummary.currency)}</strong></p>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
<div style="background-color:#fff;margin:0 auto;padding:20px 0 48px;max-width:600px;">
  <div style="padding:24px 40px;"><h1 style="color:#0d9488;font-size:28px;font-weight:700;margin:0;text-align:center;">Half Trip</h1></div>
  <div style="padding:0 40px;">
    <h1 style="color:#1f2937;font-size:24px;font-weight:600;margin:0 0 24px;">Faltam ${daysUntil} dia${daysUntil !== 1 ? 's' : ''} para sua viagem!</h1>
    <p style="color:#374151;font-size:16px;margin:0 0 16px;">Oi, <strong>${userName}</strong>! Sua viagem está quase chegando:</p>
    <div style="background-color:#f0fdfa;border-radius:8px;border:1px solid #99f6e4;padding:20px;margin:24px 0;">
      <h2 style="color:#0f766e;font-size:20px;font-weight:600;margin:0 0 12px;">${tripName}</h2>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Destino:</strong> ${tripDestination}</p>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Início:</strong> ${startDate}</p>
    </div>
    ${pendingSection}
    ${budgetSection}
    <div style="text-align:center;margin:32px 0;">
      <a href="${tripUrl}" style="background-color:#0d9488;border-radius:6px;color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 24px;display:inline-block;">Ver viagem</a>
    </div>
    <p style="color:#6b7280;font-size:14px;margin:24px 0 0;">Bom planejamento e boa viagem!</p>
  </div>
  <hr style="border-color:#e5e7eb;margin:32px 40px;" />
  <div style="padding:0 40px;"><p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;"><a href="https://halftrip.com" style="color:#0d9488;text-decoration:underline;">Half Trip</a> - Planeje junto. Viaje melhor. Divida justo.</p></div>
</div>
</body></html>`;
}
