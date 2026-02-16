# Security Best Practices Report — Half Trip (2026-02-15)

## Atualizacao (2026-02-16)

- [Mitigado] AviationStack agora usa HTTPS: `supabase/functions/fetch-flight-data/index.ts`.
- [Mitigado] Edge Functions de email agora exigem autenticacao no handler (cron bearer service role e/ou `X-Cron-Secret`): `supabase/functions/send-*/index.ts`.
- [Mitigado] Links de auth nao usam `Origin` como base; usam `NEXT_PUBLIC_APP_URL`/`APP_URL`: `src/lib/supabase/auth.ts`.
- [Mitigado] Funcoes `SECURITY DEFINER` criticas foram recriadas com `SET search_path`: `supabase/migrations/20260216193001_harden_security_definer_search_path.sql`.

## Executive summary

Os maiores riscos práticos hoje estão em (1) drift entre schema real e migrações (pode levar a bypasses e falhas operacionais), (2) abuso/custo em endpoints de proxy (Places) sem rate limiting e (3) gestao de segredos/tokens (Google OAuth) em texto plano. Ha tambem lacunas de “defesa em profundidade” (CSP/headers).

## Critical

### [SEC-001] Integração externa via HTTP (API key em querystring)

- **Local:** `supabase/functions/fetch-flight-data/index.ts:41-56`
- **Evidência:** URL base `http://api.aviationstack.com/v1/flights` e `access_key` em querystring.
- **Impacto (1 frase):** risco de vazamento de credenciais e MITM ao trafegar a chave sem TLS.
- **Recomendação:** trocar para HTTPS, adicionar timeout/retry com limites e tratar `response.ok` antes de `json()`.

### [SEC-002] Execução de rotinas de email com `service_role` sem autenticação/segredo no handler

- **Local:** `supabase/functions/send-daily-summary/index.ts:7-33` e `supabase/functions/send-trip-reminders/index.ts:7-30`
- **Evidência:** uso de `SUPABASE_SERVICE_ROLE_KEY` com handler que não valida nenhum segredo/header antes de executar queries e disparar emails.
- **Impacto (1 frase):** abuso para disparo massivo de emails e acesso a dados de múltiplas viagens por quem conseguir invocar a função.
- **Recomendação:** exigir header com segredo de cron (deny-by-default), reduzir CORS, e registrar auditoria (invocation id + contagem enviada).

### [SEC-003] `SECURITY DEFINER` sem `SET search_path` seguro

- **Local:** `supabase/migrations/00003_rls_policies.sql:23-44`, `supabase/migrations/00001_initial_schema.sql:219-230`
- **Evidência:** funções `is_trip_member`, `is_trip_organizer` e `handle_new_user` não definem `search_path`.
- **Impacto (1 frase):** possível escalonamento de privilégio em Postgres por “search_path hijacking” em funções privilegiadas.
- **Recomendação:** adicionar `SET search_path = public, auth` (ou equivalente) e revisar grants/ownership das funções.

## High

### [SEC-004] Geração de links de confirmação/reset baseada em `Origin` do request

- **Local:** `src/lib/supabase/auth.ts:26-68` (também `:90-118` e `:150+` para recovery)
- **Evidência:** `const origin = headersList.get('origin') || ''` e uso em `confirmationUrl`/`resetUrl`.
- **Impacto:** links podem ser gerados com host incorreto (proxy/misconfig) e degradar segurança operacional do fluxo de autenticação.
- **Recomendação:** usar `NEXT_PUBLIC_APP_URL`/`APP_URL` como base e validar allowlist de hosts.

### [SEC-005] Drift entre migrações e schema tipado (risco de configuração e controles inconsistentes)

- **Local:** `supabase/migrations/00001_initial_schema.sql:103-134` vs `src/types/database.ts:345-479`
- **Evidência:** migrações definem `expenses.paid_by NOT NULL` e `expense_splits.user_id NOT NULL`; tipos e Server Actions usam `paid_by_participant_id`/`participant_id` e suportam `null` para convidados.
- **Impacto:** ambientes novos podem ficar com RLS/constraints diferentes do esperado, quebrando controles e fluxos críticos (inclui LGPD e integridade financeira).
- **Recomendação:** alinhar migrações com schema real; adicionar checagem automática de drift no CI.

### [SEC-006] Rate limiting ausente em endpoints de proxy para Google Places

- **Local:** `src/app/api/places/details/route.ts:1-120` e `src/app/api/places/photo/route.ts:1-75`
- **Evidência:** endpoints exigem usuário autenticado, mas não impõem quotas/rate limits.
- **Impacto:** abuso para exaurir quota e gerar custo (DoS econômico).
- **Recomendação:** rate limit por `user.id`/IP, logs de uso e cache agressivo.

## Medium

### [SEC-007] Falta de CSP (defesa em profundidade para XSS/clickjacking)

- **Local:** `next.config.ts:23-55`
- **Evidência:** headers globais não incluem `Content-Security-Policy` nem `frame-ancestors`.
- **Impacto:** XSS (se ocorrer em algum ponto) tende a ter impacto maior; clickjacking depende de proteção no edge.
- **Recomendação:** começar com `Content-Security-Policy-Report-Only`, coletar relatórios, depois endurecer; incluir `frame-ancestors 'self'`.

### [SEC-008] HSTS com `includeSubDomains; preload` sem governança explícita

- **Local:** `next.config.ts:33-35`
- **Evidência:** `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- **Impacto:** pode causar indisponibilidade se subdomínios não estiverem todos em HTTPS e governados.
- **Recomendação:** confirmar estratégia de domínio/subdomínios antes de manter preload; caso contrário, remover `preload`/`includeSubDomains`.

## Low

### [SEC-009] Observabilidade de segurança limitada a `console.*`

- **Local:** `src/lib/errors/logger.ts`
- **Evidência:** logs estruturados apenas em console; sem correlação por request.
- **Impacto:** maior MTTR e menor capacidade de investigação.
- **Recomendação:** adicionar correlation id por request e integração opcional (Sentry/Logflare).
