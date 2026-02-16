# Auditoria E2E — Half Trip (2026-02-16)

Escopo: verificação ponta a ponta (produto + engenharia + operações), cobrindo fluxos críticos e os pontos mais arriscados do código (Server Actions, RLS/migrações, sync offline, balance/settlements, API routes, Edge Functions e integrações).

## Evidências rápidas (o que rodei localmente)

- `pnpm test`: 39 arquivos, 358 testes, passou.
- `pnpm build`: passou (Next.js + TypeScript).
- `pnpm lint`: passou com 4 warnings (`@typescript-eslint/no-unused-vars`).
- `pnpm check:edge-functions`: não rodei localmente (Deno não está instalado nesta máquina).

## Correções aplicadas nesta rodada (com regressão automatizada)

- Edge Functions (cron/email): exigem autenticação no handler.
  - Aceita o modo atual do Supabase Cron: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
  - Aceita modo opcional: `X-Cron-Secret` quando `CRON_SECRET` estiver configurado
  - Arquivos:
    - `supabase/functions/send-daily-summary/index.ts`
    - `supabase/functions/send-trip-reminders/index.ts`
- Integração de voos (AviationStack): usa HTTPS.
  - Arquivo: `supabase/functions/fetch-flight-data/index.ts`
- Drift de schema (fresh deploy): adiciona `trip_participants`, `trip_groups`, RPC e colunas `*_participant_id`.
  - Arquivo: `supabase/migrations/20260216193000_add_trip_participants_and_groups.sql`
- Hardening Postgres: recria funções `SECURITY DEFINER` críticas com `SET search_path` seguro.
  - Arquivo: `supabase/migrations/20260216193001_harden_security_definer_search_path.sql`
- Links de email (auth): base URL não vem do header `Origin`; usa `NEXT_PUBLIC_APP_URL`/`APP_URL`.
  - Arquivo: `src/lib/supabase/auth.ts`
- Teste de regressão para evitar “voltar atrás”:
  - Arquivo: `src/security/regressions.test.ts`

---

## 1) Mapa do Fluxo E2E (5 fluxos críticos)

### 1. Autenticação (login/registro/reset)

- Entrada:
  - UI: `src/app/(auth)/*`
  - Server Actions: `src/lib/supabase/auth.ts` (`signUp`, `signIn`, `forgotPassword`, `resetPassword`)
  - Callback Supabase: `src/app/auth/callback/route.ts`
- Validações:
  - Zod (ex: `src/lib/validation/auth-schemas.ts`)
  - Supabase Auth (credenciais, email confirmado, sessão)
- Regras:
  - Emails transacionais via Resend (templates em `src/lib/email/*`)
  - URLs de confirmação/reset baseadas em `NEXT_PUBLIC_APP_URL`/`APP_URL`
- Persistência:
  - `auth.users` (Supabase) + `public.users` via trigger `handle_new_user()`
- Saída:
  - Sessão (SSR via `@supabase/ssr`) e redirect para `/trips` (ou rota de retorno)

### 2. Criar viagem + membership + participants

- Entrada:
  - UI: `src/components/trips/*`
  - Server Action: `src/lib/supabase/trips.ts:createTrip`
  - RPC: `create_trip_with_member` (`supabase/migrations/00007_create_trip_rpc.sql`)
- Validações:
  - Form + constraints do banco (datas)
  - Permissões via RLS e helpers `is_trip_member`/`is_trip_organizer`
- Regras:
  - `trip_members` é a fonte de verdade de papéis (organizer/participant)
  - `trip_participants` representa pessoas na conta (inclui guests) e é mantida em sync para membros
- Persistência:
  - `trips`, `trip_members`, `trip_participants` (trigger: `ensure_trip_participant_for_member`)
- Saída:
  - Lista/overview atualizada (revalidate) e contexto de trip disponível no app

### 3. Adicionar despesa + dividir (multi-moeda + guests)

- Entrada:
  - UI: `src/components/expenses/add-expense-dialog.tsx`, `src/components/expenses/quick-add-expense.tsx`
  - Schema: `src/lib/validation/expense-schemas.ts`
  - Server Action: `src/lib/supabase/expenses.ts:createExpense`
- Validações:
  - `paid_by_participant_id` deve existir em `trip_participants` (server)
  - `splits[].participant_id` devem existir em `trip_participants`
  - Splits somam o `amount` (tolerância 0.01)
- Regras:
  - Conversão para moeda base via `exchange_rate` (quando aplicável)
  - `paid_by` (user_id) é derivado do participant e pode ser `null` para guest
- Persistência:
  - `expenses` + `expense_splits`
  - Observação: hoje é operação composta com rollback manual (não transacional no DB)
- Saída:
  - UI atualiza lista/recap e alimenta o activity log

### 4. Balance + settlements

- Entrada:
  - Read model: `src/lib/supabase/expense-summary.ts`
  - Cálculos: `src/lib/balance/*`
  - UI: `src/components/summary/trip-summary.tsx` + páginas de trip
- Validações/regras:
  - Normalização para moeda base (via exchange rate)
  - Rounding em 2 casas para apresentar valores
- Persistência:
  - `settlements` via `src/lib/supabase/settlements.ts` (participant-based)
- Saída:
  - Sugestão de acertos + histórico; suporte a PIX/QR (quando configurado)

### 5. Offline sync + integrações (Places, Google Calendar, Emails)

- Offline:
  - IndexedDB (Dexie): `src/lib/sync/db.ts`
  - Fila e engine: `src/lib/sync/sync-engine.ts`
  - Hook: `src/hooks/use-auto-sync.ts`
  - Estratégia atual: FIFO + last-write-wins (por `updated_at`)
- Places:
  - Proxy/caching: `src/app/api/places/details/route.ts`, `src/app/api/places/photo/route.ts`
  - Cache: `place_details_cache`
- Google Calendar:
  - OAuth connect/callback: `src/app/api/google-calendar/connect/route.ts`, `src/app/api/google-calendar/callback/route.ts`
  - Sync/disconnect: `src/app/api/google-calendar/sync/route.ts`, `src/app/api/google-calendar/disconnect/route.ts`
  - Persistência tokens: `google_calendar_connections` e tabelas de sync
- Emails (cron):
  - Edge Functions: `supabase/functions/send-trip-reminders/index.ts`, `supabase/functions/send-daily-summary/index.ts`
  - Controle: auth no handler + logs/prefs em `email_logs`/`user_email_preferences`

---

## 2) Achados Priorizados

| Severidade | Área                        | Evidência (arquivo/trecho)                                                            | Impacto                                                                                                            | Recomendação                                                                                                                                      |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1         | Confiabilidade/Dados        | `src/lib/supabase/expenses.ts`                                                        | `expenses` + `expense_splits` não são atômicos; rollback manual pode falhar e deixar estado parcial.               | Criar RPC transacional `create_expense_with_splits` no Postgres (validações e inserts na mesma transação).                                        |
| P1         | Confiabilidade/Idempotência | `src/lib/supabase/settlements.ts` + constraints de `settlements` em migrações         | Retentativas (sync offline/UX) podem duplicar acertos se não houver chave idempotente para “settlement aberto”.    | Definir constraint/UPSERT para settlement aberto por (trip_id, from_participant_id, to_participant_id, currency) ou introduzir `idempotency_key`. |
| P1         | Segurança/Custo             | `src/app/api/places/details/route.ts`, `src/app/api/places/photo/route.ts`            | Endpoint autenticado pode drenar quota/custo (DoS econômico) sem rate limiting/quotas.                             | Rate limit por `user.id`/IP + quotas diárias; logs por `place_id`; caching agressivo.                                                             |
| P1         | LGPD/Segredos               | `supabase/migrations/00014_google_calendar_integration.sql`                           | Tokens OAuth (incluindo `refresh_token`) em texto plano ampliam impacto de vazamento e obrigações LGPD.            | Minimizar armazenamento (não persistir access token), criptografar em repouso (pgcrypto/KMS), e definir retenção/rotina de revogação.             |
| P1         | Offline/Conflitos           | `src/lib/sync/sync-engine.ts`                                                         | Last-write-wins pode causar perda silenciosa de edição colaborativa quando reconcilia offline→online.              | Registrar conflito e expor UX de resolução; evoluir por entidade (merge para notas; field-level em alguns campos).                                |
| P1         | Offline/Retry               | `src/lib/sync/sync-engine.ts`, `src/hooks/use-auto-sync.ts`                           | Sem backoff/jitter/dead-letter consistente, itens falhos podem ser reprocessados indefinidamente (ruído/custo/UX). | Implementar backoff com jitter + limite de retries e dead-letter; UI para retry manual/limpar fila.                                               |
| P1         | Auth/Gating                 | `src/lib/supabase/middleware.ts` (não é entrypoint) + ausência de `src/middleware.ts` | Session refresh/gating pode ficar inconsistente entre rotas server/client.                                         | Implementar `src/middleware.ts` real com `updateSession` e whitelist de rotas públicas.                                                           |
| P2         | Segurança/Headers           | `next.config.ts`                                                                      | Falta CSP/frame-ancestors reduz defesa em profundidade (XSS/clickjacking).                                         | Adicionar CSP em `Report-Only` primeiro + `frame-ancestors 'self'`; endurecer após coletar violações.                                             |
| P2         | Dinheiro/Precisão           | `src/lib/balance/*`                                                                   | Cálculos em `number` podem acumular erro em multi-moeda e gerar centavos inconsistentes.                           | Migrar para “centavos” (inteiros) na moeda base ou usar decimal library no domínio financeiro.                                                    |
| P2         | CI/E2E                      | `.github/workflows/*`                                                                 | Playwright E2E não roda no CI (risco de regressões em fluxos críticos).                                            | Adicionar job smoke E2E por PR ou nightly com ambiente de teste.                                                                                  |
| P2         | DX/Edge                     | `pnpm check:edge-functions`                                                           | Checagem local de Edge Functions depende de Deno e pode ficar fora do ciclo de feedback.                           | Documentar pré-requisito e/ou rodar via container; manter job no CI como gate.                                                                    |

---

## 3) Plano 30/60/90 dias (executável)

### 0-30 dias (quick wins)

1. RPC transacional para `create_expense_with_splits` (substituir rollback manual).
2. Settlement idempotente (constraint + UPSERT ou `idempotency_key`).
3. Rate limiting + quotas nos endpoints `/api/places/*` + logs de consumo.
4. Healthcheck confiável sem depender de sessão/RLS (para monitores).
5. Offline: backoff com jitter + dead-letter + UX de retry/limpar.

### 31-60 dias (robustez)

1. Middleware real do Next (`src/middleware.ts`) com refresh e proteção consistente das rotas.
2. Conflicts: “não sobrescrever silenciosamente” como primeiro passo (registrar e mostrar ao usuário).
3. Tokens Google: reduzir superfície (não armazenar access token), iniciar criptografia e rotação.

### 61-90 dias (escala/observabilidade/perf)

1. SLIs/SLOs:
   - Sync: taxa de sucesso e latência p50/p95
   - Emails: taxa de envio e falhas por template
   - API Places: erro/quota por usuário
2. Observabilidade: logs estruturados com correlação por request e por operação de sync.
3. Performance: auditoria de bundle (jsPDF/Maps/Motion) e queries agregadas (reduzir N+1 em recap/dashboards/emails).

---

## 4) Advogado do Diabo (5 riscos do plano + contramedidas)

1. Risco: RPC transacional muda contratos e quebra UI/Offline.
   - Contramedida: manter shape de retorno/erros compatível; cobertura com unit + Playwright smoke.
2. Risco: Rate limiting pode bloquear uso legítimo (Places) em viagens grandes.
   - Contramedida: quotas graduais e ajustáveis; caches e fallback; logs para tuning.
3. Risco: Idempotência em settlements pode impedir cenários válidos (múltiplos acertos no mesmo par).
   - Contramedida: chave idempotente só para “aberto” e permitir múltiplos quando `settled_at` definido.
4. Risco: Resolver conflitos offline pode “assustar” o usuário com UI complexa.
   - Contramedida: começar com conflito “informativo + opção de escolher” apenas em entidades de alto risco (notas e despesas).
5. Risco: Criptografia de tokens Google aumenta complexidade operacional (chaves/rotação).
   - Contramedida: introduzir por etapas: minimização primeiro, depois criptografia, depois rotação automatizada.

---

## 5) Critérios de aceite (como saber que ficou bom)

- Correção/Release:
  - `pnpm test`, `pnpm build`, `pnpm lint` passam em PR e `main`.
- Dados:
  - Deploy “fresh” cria tabelas/colunas usadas pelo app (incluindo `trip_participants` e colunas participant-based em despesas/splits/settlements).
- Segurança:
  - Edge Functions de email negam acesso sem autenticação (cron secret ou bearer service role).
  - Não há funções `SECURITY DEFINER` usadas por RLS/triggers sem `SET search_path` seguro.
  - Integrações externas só via HTTPS e tratam timeouts/erros.
- Offline:
  - Sync tem backoff + dead-letter; não reprocessa falhas infinitamente; UI permite retry/limpar.
  - Conflitos são detectados e não são sobrescritos silenciosamente.
- Observabilidade:
  - Logs de ações críticas incluem `action`, `tripId`, `userId` (quando aplicável) e erro serializado.
- E2E:
  - Smoke Playwright cobre: login, criar trip, adicionar despesa, ver balanço, aceitar invite, sync Google Calendar (ao menos happy paths).
