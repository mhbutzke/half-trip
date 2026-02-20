import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { generateBaseEmailHtml, emailStyles } from '../_shared/base-html-template.ts';
import { dispatchTripReminderEmail } from '../_shared/email-dispatch.ts';
import { generateUnsubscribeUrl } from '../_shared/unsubscribe-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRON_SECRET_HEADER = 'X-Cron-Secret';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This function runs with SUPABASE_SERVICE_ROLE_KEY, so it must be protected from arbitrary invocation.
    // Supabase cron uses `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` by default. We also optionally
    // support `X-Cron-Secret` so callers can avoid sending the service role key over the wire.
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const authorizedByCronSecret =
      !!cronSecret && req.headers.get(CRON_SECRET_HEADER) === cronSecret;
    const authorizedByServiceRole = !!serviceRoleKey && bearerToken === serviceRoleKey;

    if (!authorizedByCronSecret && !authorizedByServiceRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseServiceKey = serviceRoleKey;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'https://halftrip.app';

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find trips starting in exactly 3 days
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

      for (const member of trip.trip_members || []) {
        const user = (member as Record<string, unknown>).users as {
          id: string;
          name: string;
          email: string;
        } | null;
        if (!user?.email) continue;

        // Check user preferences
        const { data: prefs } = await supabase
          .from('user_email_preferences')
          .select('trip_reminder_emails')
          .eq('user_id', user.id)
          .single();

        if (prefs && prefs.trip_reminder_emails === false) {
          console.log(`User ${user.id} opted out of trip reminders`);
          continue;
        }

        // Generate unsubscribe URL
        const unsubscribeUrl = await generateUnsubscribeUrl(
          { userId: user.id, email: user.email, emailType: 'trip_reminder' },
          appUrl
        );

        const bodyHtml = buildReminderBodyHtml({
          userName: user.name,
          tripName: trip.name,
          tripDestination: trip.destination,
          startDate: formattedDate,
          tripUrl: `${appUrl}/trip/${trip.id}`,
          pendingItems,
          budgetSummary,
        });

        const html = generateBaseEmailHtml({
          previewText: `${trip.name} começa em 3 dias!`,
          heading: 'Faltam 3 dias para sua viagem!',
          bodyHtml,
          unsubscribeUrl,
        });

        const subject = `${trip.name} começa em 3 dias!`;
        const result = await dispatchTripReminderEmail({
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

function buildReminderBodyHtml(props: {
  userName: string;
  tripName: string;
  tripDestination: string;
  startDate: string;
  tripUrl: string;
  pendingItems: {
    incompleteChecklists: number;
    pendingSettlements: number;
    activitiesWithoutTime: number;
  };
  budgetSummary: { spent: number; total: number | null; currency: string } | null;
}): string {
  const { userName, tripName, tripDestination, startDate, tripUrl, pendingItems, budgetSummary } =
    props;

  const s = emailStyles;
  const formatCurrency = (v: number, c: string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c }).format(v);

  const pendingHtml: string[] = [];
  if (pendingItems.incompleteChecklists > 0)
    pendingHtml.push(
      `<p style="${s.listItem}">☐ ${pendingItems.incompleteChecklists} item(ns) de checklist incompleto(s)</p>`
    );
  if (pendingItems.pendingSettlements > 0)
    pendingHtml.push(
      `<p style="${s.listItem}">💰 ${pendingItems.pendingSettlements} acerto(s) pendente(s)</p>`
    );
  if (pendingItems.activitiesWithoutTime > 0)
    pendingHtml.push(
      `<p style="${s.listItem}">🕐 ${pendingItems.activitiesWithoutTime} atividade(s) sem horário</p>`
    );

  const pendingSection =
    pendingHtml.length > 0
      ? `<h3 style="${s.subheading}">Itens pendentes</h3>${pendingHtml.join('')}`
      : '';

  const budgetSection = budgetSummary?.total
    ? `<h3 style="${s.subheading}">Orçamento</h3><p style="${s.paragraph}">Gasto até agora: <strong>${formatCurrency(budgetSummary.spent, budgetSummary.currency)}</strong> de <strong>${formatCurrency(budgetSummary.total, budgetSummary.currency)}</strong></p>`
    : '';

  return `<p style="${s.paragraph}">Oi, <strong>${userName}</strong>! Sua viagem está quase chegando:</p>
<div style="${s.card}">
  <h2 style="${s.cardTitle}">${tripName}</h2>
  <p style="${s.cardText}"><strong>Destino:</strong> ${tripDestination}</p>
  <p style="${s.cardText}"><strong>Início:</strong> ${startDate}</p>
</div>
${pendingSection}
${budgetSection}
<div style="${s.buttonContainer}">
  <a href="${tripUrl}" style="${s.button}">Ver viagem</a>
</div>
<p style="${s.footnote}">Bom planejamento e boa viagem!</p>`;
}
