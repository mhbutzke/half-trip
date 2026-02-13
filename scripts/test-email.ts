/**
 * Script de teste para enviar email via Resend.
 * Usa o template WelcomeEmail para validar o pipeline end-to-end.
 *
 * Uso: npx tsx scripts/test-email.ts
 */

// Carrega .env (Node 20+)
process.loadEnvFile();

import { Resend } from 'resend';
import { render } from '@react-email/components';
import { WelcomeEmail } from '../src/lib/email/welcome-email';

const TO = 'mhbutzke@gmail.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY não encontrada no .env');
    process.exit(1);
  }

  console.log('📧 Renderizando template WelcomeEmail...');

  const html = await render(
    WelcomeEmail({
      userName: 'Matheus',
      loginUrl: `${APP_URL}/login`,
      unsubscribeUrl: `${APP_URL}/unsubscribe?token=test-token`,
    })
  );

  console.log(`📧 Template renderizado (${html.length} chars)`);
  console.log(`📧 Enviando para ${TO}...`);

  const resend = new Resend(apiKey);

  // Tenta enviar do domínio do app primeiro; fallback para sandbox do Resend
  const fromAddresses = [
    'Half Trip <boas-vindas@halftrip.com>',
    'Half Trip <onboarding@resend.dev>',
  ];

  for (const from of fromAddresses) {
    console.log(`📧 Tentando from: ${from}`);

    const { data, error } = await resend.emails.send({
      from,
      to: TO,
      subject: '[TESTE] Bem-vindo ao Half Trip!',
      html,
    });

    if (error) {
      console.warn(`⚠️  Falha com "${from}": ${error.message}`);
      continue;
    }

    console.log('✅ Email enviado com sucesso!');
    console.log(`   Email ID: ${data?.id}`);
    console.log(`   Para: ${TO}`);
    console.log(`   From: ${from}`);
    return;
  }

  console.error('❌ Falha ao enviar email com todos os endereços de remetente.');
  process.exit(1);
}

main().catch((err) => {
  console.error('❌ Erro inesperado:', err);
  process.exit(1);
});
