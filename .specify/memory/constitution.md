<!--
Sync Impact Report:
- Version change: [template] → 1.0.0 (initial constitution)
- Modified principles: N/A (initial)
- Added sections: Core Principles, Stack & Constraints, Development Workflow, Governance
- Removed sections: N/A
- Templates: ✅ constitution.md updated
- Follow-up TODOs: None
-->

# Half Trip Constitution

## Core Principles

### I. User-Centric First

Toda feature deve priorizar a experiência do usuário final. O Half Trip existe para facilitar
viagens em grupo — interfaces claras, fluxos intuitivos e feedback imediato são obrigatórios.
Decisões de UX devem ser justificadas com base em cenários reais de uso.

### II. Offline-First & PWA

O app DEVE funcionar offline como PWA. Dados críticos (viagens, despesas, participantes) precisam
ser acessíveis sem conexão. Sincronização automática ao reconectar é obrigatória. Nunca bloquear
a interface principal por indisponibilidade de rede.

### III. Test-First (NON-NEGOTIABLE)

- **Unitários**: Lógica de negócio (cálculo de balanço, validações Zod) DEVE ter testes antes ou
  junto da implementação.
- **E2E**: Fluxos críticos (auth, criar viagem, adicionar despesa, convite) devem ter cobertura
  Playwright.
- **Critério**: Testes não devem ser adicionados como "afterthought" — planejamento de specs
  inclui cenários de teste.

### IV. Type Safety & Validação

TypeScript strict mode obrigatório. Zod para validação de entrada e contratos de API. Tipos
explicitos em funções públicas e interfaces críticas. Evitar `any` e `as` — buscar alternativas
type-safe.

### V. Simplicidade (YAGNI)

Começar simples. Evitar over-engineering. Features devem ser incrementais e entregáveis. Não
adicionar abstrações antes de existir duplicação real ou requisito explícito.

## Stack & Constraints

- **Frontend**: Next.js (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State**: React Query, Zustand
- **Offline**: IndexedDB (Dexie.js), Service Workers
- **Testes**: Vitest, Testing Library, Playwright
- **Qualidade**: ESLint, Prettier, Husky

## Development Workflow

- **Commits**: Husky pre-commit roda lint + format. PRs devem passar CI (lint, test, build).
- **Deploy**: `pnpm verify-deploy` antes de merge. Verificar DEPLOYMENT.md para fluxo completo.
- **Docs**: Documentar decisões de arquitetura em arquivos específicos (ex. ERROR_HANDLING.md,
  MONITORING.md) quando impactarem múltiplos módulos.

## Governance

Esta Constitution prevalece sobre práticas ad-hoc. Alterações exigem:

1. Documentação da mudança e justificativa
2. Atualização do versionamento semântico
3. Propagação de alterações em templates dependentes (spec, plan, tasks)

Todos os PRs devem verificar conformidade com estes princípios. Complexidade adicional deve
ser justificada.

**Version**: 1.0.0 | **Ratified**: 2026-02-12 | **Last Amended**: 2026-02-12
