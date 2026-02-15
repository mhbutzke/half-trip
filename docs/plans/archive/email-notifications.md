# Notificações por email

Este documento descreve o fluxo atual de envio de e-mail no Half Trip.

## Estrutura de envio

- Arquivo principal: `src/lib/email/service.ts`
- Tipos de e-mail suportados: `invite`, `trip_reminder`, `daily_summary`, `welcome`, `confirmation`
- Regras em `src/types/email.ts`

## Variáveis necessárias

- `RESEND_API_KEY` — habilita envio via Resend
- `RESEND_WEBHOOK_SECRET` — valida assinatura de eventos enviados pela Resend
- `UNSUBSCRIBE_SECRET` — assina o token de cancelamento de inscrição
- `SUPABASE_SERVICE_ROLE_KEY` — usado pelo webhook para atualizar `email_logs`

## Envio

1. `sendEmail` recebe `emailType`, `recipientEmail`, `subject` e `htmlContent`.
2. Se `checkPreferences` estiver habilitado (padrão), a preferência do usuário é consultada em `user_email_preferences`.
3. O envio é feito com o remetente configurado para o tipo:
   - `invite`: `Half Trip <convites@halftrip.com>`
   - `trip_reminder`: `Half Trip <lembretes@halftrip.com>`
   - `daily_summary`: `Half Trip <resumo@halftrip.com>`
   - `welcome`: `Half Trip <boas-vindas@halftrip.com>`
   - `confirmation`: `Half Trip <confirme@halftrip.com>`
4. Se a resposta da Resend indicar domínio não verificado, ocorre fallback automático para `Half Trip <onboarding@resend.dev>`.
5. Em falha no primeiro envio, há retry com atraso curto.
6. Cada tentativa e erro é registrada em `email_logs`.

## Preferências e cancelamento

- Preferências do usuário são gerenciadas por `src/lib/supabase/email-preferences.ts` em colunas:
  - `invite_emails`
  - `trip_reminder_emails`
  - `daily_summary_emails`
  - `welcome_emails`
- O link de cancelamento usa `src/lib/email/unsubscribe-token.ts` e a rota `/unsubscribe`.
- Payloads aceitos: `invite`, `trip_reminder`, `daily_summary`, `welcome`, `all`.

## Webhook de eventos Resend

- Rota: `POST /api/webhooks/resend`
- Atualiza status em `email_logs` com base no evento recebido:
  - `email.sent` → `sent`
  - `email.delivered` → `delivered`
  - `email.delivery_delayed` → sem alteração de status
  - `email.bounced` → `bounced`
  - `email.complained` → `complained`
- A validação de assinatura é aplicada quando `RESEND_WEBHOOK_SECRET` está presente.

## Observações importantes

- Em ambiente de produção, falhar o segredo do webhook impede atualização de status no banco.
- Se o `UNSUBSCRIBE_SECRET` não for rotacionado com segurança, links de cancelamento ficam vulneráveis.
