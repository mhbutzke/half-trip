/**
 * Script de teste para enviar email de convite real para a viagem "Carnaval em Gramado".
 * Reutiliza convite pendente existente no banco ou cria novo se necessário.
 *
 * Uso: npx tsx scripts/test-invite-email.ts
 */

process.loadEnvFile();

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InviteEmail } from '../src/lib/email/invite-email';

// ── Config ───────────────────────────────────────────────────
const INVITE_EMAIL = 'jessicafbutzke@gmail.com'; // Email do convite no banco
const SEND_TO = 'mhbutzke@gmail.com'; // Destino real (sandbox do Resend só envia pro dono da conta)
const TRIP_NAME = 'Carnaval em Gramado';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ── Helpers ──────────────────────────────────────────────────
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateStr: string): string {
  return format(parseDateOnly(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  // Validate env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env');
    process.exit(1);
  }
  if (!resendApiKey) {
    console.error('❌ Faltando RESEND_API_KEY no .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(resendApiKey);

  // 1. Buscar a viagem
  console.log(`\n🔍 Buscando viagem "${TRIP_NAME}"...`);
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, name, destination, start_date, end_date, created_by')
    .ilike('name', `%${TRIP_NAME}%`)
    .single();

  if (tripError || !trip) {
    console.error('❌ Viagem não encontrada:', tripError?.message);
    process.exit(1);
  }

  console.log(`   ✅ ${trip.name}`);
  console.log(`   📍 ${trip.destination}`);
  console.log(`   📅 ${formatDate(trip.start_date)} — ${formatDate(trip.end_date)}`);

  // 2. Buscar dados do inviter (criador da viagem)
  const { data: inviter, error: inviterError } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', trip.created_by)
    .single();

  if (inviterError || !inviter) {
    console.error('❌ Inviter não encontrado:', inviterError?.message);
    process.exit(1);
  }

  console.log(`   👤 Convite de: ${inviter.name}`);

  // 3. Verificar convite existente ou criar novo
  const now = new Date().toISOString();
  const { data: existingInvite } = await supabase
    .from('trip_invites')
    .select('id, code')
    .eq('trip_id', trip.id)
    .eq('email', INVITE_EMAIL.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', now)
    .single();

  let inviteCode: string;

  if (existingInvite) {
    inviteCode = existingInvite.code;
    console.log(`\n♻️  Convite pendente existente encontrado: ${inviteCode}`);
  } else {
    inviteCode = generateInviteCode();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: insertError } = await supabase.from('trip_invites').insert({
      trip_id: trip.id,
      code: inviteCode,
      email: INVITE_EMAIL.toLowerCase(),
      invited_by: inviter.id,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('❌ Erro ao criar convite:', insertError.message);
      process.exit(1);
    }

    console.log(`\n🆕 Novo convite criado: ${inviteCode}`);
  }

  const inviteUrl = `${APP_URL}/invite/${inviteCode}`;
  console.log(`   🔗 Link: ${inviteUrl}`);

  // 4. Renderizar template
  console.log(`\n📧 Renderizando template InviteEmail...`);

  const emailHtml = await render(
    InviteEmail({
      inviteUrl,
      tripName: trip.name,
      tripDestination: trip.destination,
      tripStartDate: formatDate(trip.start_date),
      tripEndDate: formatDate(trip.end_date),
      inviterName: inviter.name,
      recipientEmail: INVITE_EMAIL,
    })
  );

  console.log(`   ✅ Template renderizado (${emailHtml.length} chars)`);

  // 5. Enviar email
  console.log(
    `\n📧 Enviando convite para ${SEND_TO} (sandbox — convite real é para ${INVITE_EMAIL})...`
  );

  const fromAddresses = ['Half Trip <convites@halftrip.com>', 'Half Trip <onboarding@resend.dev>'];

  for (const from of fromAddresses) {
    console.log(`   📮 Tentando from: ${from}`);

    const { data, error } = await resend.emails.send({
      from,
      to: SEND_TO,
      subject: `[TESTE] Convite para viagem: ${trip.name}`,
      html: emailHtml,
    });

    if (error) {
      console.warn(`   ⚠️  Falha: ${error.message}`);
      continue;
    }

    console.log(`\n✅ Email de convite enviado com sucesso!`);
    console.log(`   📧 Email ID: ${data?.id}`);
    console.log(`   📬 Enviado para: ${SEND_TO} (sandbox)`);
    console.log(`   📬 Convite vinculado a: ${INVITE_EMAIL}`);
    console.log(`   📮 From: ${from}`);
    console.log(`   🎫 Invite Code: ${inviteCode}`);
    console.log(`   🔗 Link: ${inviteUrl}`);
    console.log(`\n⚠️  NOTA: Resend sandbox — email enviado para ${SEND_TO} como preview.`);
    console.log(`   Para enviar para ${INVITE_EMAIL}, verifique um domínio em resend.com/domains`);
    console.log(`\n📋 Fluxo completo para Jessica (quando domínio verificado):`);
    console.log(`   1. Abrir o email e clicar "Ver convite e participar"`);
    console.log(`   2. Na página do convite, clicar "Criar conta"`);
    console.log(`   3. Preencher cadastro → confirmar email`);
    console.log(`   4. Voltar ao link do convite → clicar "Participar da viagem"`);
    return;
  }

  console.error('\n❌ Falha ao enviar email com todos os remetentes.');
  process.exit(1);
}

main().catch((err) => {
  console.error('❌ Erro inesperado:', err);
  process.exit(1);
});
