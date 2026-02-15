# Fase 1: Fundação Arquitetural — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralizar rotas, permissões, activity logging e revalidation para eliminar duplicação e inconsistência espalhadas por ~40 arquivos.

**Architecture:** Criar módulos centralizados (`routes.ts`, `revalidation.ts`) e migrar progressivamente. Expandir uso do sistema de permissões existente (`trip-permissions.ts`) de 3 para ~31 arquivos. Adicionar activity logging nos 6 server actions que faltam.

**Tech Stack:** TypeScript, Next.js 16 App Router, Supabase

---

### Task 1: Criar constantes de rotas type-safe

**Files:**

- Create: `src/lib/routes.ts`

**Step 1: Criar arquivo de rotas**

```typescript
/**
 * Centralized type-safe route builders.
 * All navigation and revalidation paths should use these constants.
 */
export const routes = {
  home: () => '/' as const,
  trips: () => '/trips' as const,
  settings: () => '/settings' as const,
  login: () => '/login' as const,
  register: () => '/register' as const,
  forgotPassword: () => '/forgot-password' as const,
  resetPassword: () => '/reset-password' as const,
  invite: (code: string) => `/invite/${code}` as const,
  trip: {
    overview: (id: string) => `/trip/${id}` as const,
    itinerary: (id: string) => `/trip/${id}/itinerary` as const,
    expenses: (id: string) => `/trip/${id}/expenses` as const,
    expenseEdit: (tripId: string, expenseId: string) =>
      `/trip/${tripId}/expenses/${expenseId}/edit` as const,
    balance: (id: string) => `/trip/${id}/balance` as const,
    budget: (id: string) => `/trip/${id}/budget` as const,
    participants: (id: string) => `/trip/${id}/participants` as const,
    checklists: (id: string) => `/trip/${id}/checklists` as const,
    notes: (id: string) => `/trip/${id}/notes` as const,
  },
} as const;
```

**Step 2: Commit**

```bash
git add src/lib/routes.ts
git commit -m "feat: add centralized type-safe route constants"
```

---

### Task 2: Migrar strings de rota hardcoded

**Files:** ~40 arquivos que contêm strings de rota (ver lista abaixo)

**Categorias de migração:**

1. **`href` em componentes** — Substituir `href="/trips"` por `href={routes.trips()}`
2. **`router.push()`** — Substituir `router.push('/trips')` por `router.push(routes.trips())`
3. **`redirect()`** — Substituir `redirect('/login')` por `redirect(routes.login())`
4. **`revalidatePath()`** — Será migrado na Task 5 (revalidation centralizada)
5. **`pathname.startsWith()`** — Em navs/tab bars, substituir strings por `routes.trip.*`

**Padrão de migração:**

Para cada arquivo, adicionar import:

```typescript
import { routes } from '@/lib/routes';
```

E substituir as strings. Exemplos:

- `href="/trips"` → `href={routes.trips()}`
- `router.push(\`/trip/${tripId}/expenses\`)`→`router.push(routes.trip.expenses(tripId))`
- `redirect('/login')` → `redirect(routes.login())`

**Arquivos principais a migrar (em ordem):**

- `src/components/layout/mobile-nav.tsx` (rotas de navegação)
- `src/components/layout/trip-sidebar.tsx` (rotas de sidebar)
- `src/components/layout/finances-tab-bar.tsx` (rotas de finanças)
- `src/components/layout/header.tsx` (rotas de header)
- `src/app/(app)/trips/trips-list.tsx` (rotas de viagens)
- `src/app/(app)/trip/[id]/trip-header.tsx` (rotas de trip header)
- `src/app/(app)/trip/[id]/expenses/expenses-list.tsx` (rotas de despesas)
- `src/components/expenses/expense-form.tsx` (back link + redirect)
- `src/app/invite/[code]/invite-content.tsx` (redirect após aceitar)
- Todos os server actions em `src/lib/supabase/*.ts` (redirect calls)

**Verificação:**

```bash
npm run lint && npm run build
# Verificar que não restam strings hardcoded:
grep -rn "'/trip/" src/ --include="*.tsx" --include="*.ts" | grep -v "routes\." | grep -v "node_modules" | grep -v ".test."
```

**Commit por batch (navs, pages, server actions):**

```bash
git commit -m "refactor: migrate navigation components to centralized routes"
git commit -m "refactor: migrate page components to centralized routes"
git commit -m "refactor: migrate server actions to centralized routes"
```

---

### Task 3: Centralizar permissões

**Files:**

- Modify: `src/hooks/use-permissions.ts` (já existe, expandir se necessário)
- Modify: ~31 arquivos com lógica de permissão inline

**Contexto:**

- `src/lib/permissions/trip-permissions.ts` (279 linhas) já tem modelo completo:
  - `can(action, userRole)`, `canOnOwn(action, userRole, isOwner)`, `isOrganizer()`, etc.
  - 17 PermissionActions definidas
- `src/hooks/use-permissions.ts` (115 linhas) já wrapa tudo com hook
- Só 3 arquivos usam o sistema centralizado

**Padrão de migração em componentes client:**

Antes (inline):

```tsx
const canEdit = userRole === 'organizer' || expense.created_by === currentUserId;
```

Depois (centralizado):

```tsx
import { usePermissions } from '@/hooks/use-permissions';
const { canOnOwn } = usePermissions({ userRole, currentUserId });
const canEdit = canOnOwn('EDIT_EXPENSE', expense.created_by);
```

**Padrão de migração em server actions:**

Antes (inline):

```tsx
const member = trip_members.find((m) => m.user_id === user.id);
if (member?.role !== 'organizer') return { error: 'Sem permissão' };
```

Depois (centralizado):

```tsx
import { can } from '@/lib/permissions/trip-permissions';
if (!can('DELETE_TRIP', member?.role)) return { error: 'Sem permissão' };
```

**Arquivos prioritários:**

- `src/app/(app)/trips/trips-list.tsx` → substituir `getUserRole()` inline
- `src/app/(app)/trip/[id]/trip-header.tsx` → já usa `can()`, manter
- `src/app/(app)/trip/[id]/expenses/expenses-list.tsx` → `canEditExpense()`
- `src/components/trips/trip-card.tsx` → lógica de ações

**Commit:**

```bash
git commit -m "refactor: centralize permission checks across components and server actions"
```

---

### Task 4: Padronizar activity logging

**Files:**

- Modify: `src/lib/supabase/trips.ts` (adicionar logActivity)
- Modify: `src/lib/supabase/budgets.ts` (adicionar logActivity)
- Modify: `src/lib/supabase/attachments.ts` (adicionar logActivity)
- Modify: `src/lib/supabase/receipts.ts` (adicionar logActivity)
- Modify: `src/lib/supabase/invites.ts` (adicionar logActivity)

**Padrão existente (fire-and-forget):**

```typescript
import { logActivity } from '@/lib/supabase/activity-log';

// Após a ação bem-sucedida (depois de revalidatePath):
logActivity({
  tripId,
  userId: authUser.id,
  action: 'created',
  entityType: 'budget',
  entityId: budget.id,
  metadata: { category: input.category, amount: input.amount },
});
```

**Ações a adicionar:**

| Arquivo        | Funções                                         | Action                           | EntityType |
| -------------- | ----------------------------------------------- | -------------------------------- | ---------- |
| trips.ts       | createTrip, updateTrip, archiveTrip, deleteTrip | created/updated/archived/deleted | trip       |
| budgets.ts     | createBudget, updateBudget, deleteBudget        | created/updated/deleted          | budget     |
| attachments.ts | uploadAttachment, deleteAttachment              | created/deleted                  | attachment |
| receipts.ts    | uploadReceipt, deleteReceipt                    | created/deleted                  | receipt    |
| invites.ts     | createInviteLink, revokeInvite, acceptInvite    | created/revoked/accepted         | invite     |

**Commit:**

```bash
git commit -m "feat: add activity logging to trips, budgets, attachments, receipts, and invites"
```

---

### Task 5: Centralizar revalidation

**Files:**

- Create: `src/lib/utils/revalidation.ts`
- Modify: 13 server action files em `src/lib/supabase/`

**Step 1: Criar módulo de revalidation**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { routes } from '@/lib/routes';

/**
 * Centralized revalidation strategies by domain.
 * Each function handles cascade invalidation.
 */
export const revalidate = {
  /** Revalida lista de viagens */
  trips: () => {
    revalidatePath(routes.trips());
  },

  /** Revalida viagem específica + lista */
  trip: (tripId: string) => {
    revalidatePath(routes.trip.overview(tripId));
    revalidatePath(routes.trips());
  },

  /** Revalida despesas + viagem */
  tripExpenses: (tripId: string) => {
    revalidatePath(routes.trip.expenses(tripId));
    revalidatePath(routes.trip.balance(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },

  /** Revalida balanço */
  tripBalance: (tripId: string) => {
    revalidatePath(routes.trip.balance(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },

  /** Revalida orçamento */
  tripBudget: (tripId: string) => {
    revalidatePath(routes.trip.budget(tripId));
    revalidatePath(routes.trip.expenses(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },

  /** Revalida roteiro */
  tripItinerary: (tripId: string) => {
    revalidatePath(routes.trip.itinerary(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },

  /** Revalida checklists */
  tripChecklists: (tripId: string) => {
    revalidatePath(routes.trip.checklists(tripId));
  },

  /** Revalida notas */
  tripNotes: (tripId: string) => {
    revalidatePath(routes.trip.notes(tripId));
    revalidatePath(routes.trip.overview(tripId));
  },

  /** Revalida participantes */
  tripParticipants: (tripId: string) => {
    revalidatePath(routes.trip.participants(tripId));
    revalidatePath(routes.trip.overview(tripId));
    revalidatePath(routes.trips());
  },

  /** Revalida settings */
  settings: () => {
    revalidatePath(routes.settings());
    revalidatePath(routes.trips());
  },
};
```

**Step 2: Migrar chamadas em todos os server actions**

Antes:

```typescript
revalidatePath(`/trip/${tripId}`);
revalidatePath(`/trip/${tripId}/expenses`);
revalidatePath('/trips');
```

Depois:

```typescript
import { revalidate } from '@/lib/utils/revalidation';
revalidate.tripExpenses(tripId);
```

**Arquivos a migrar (13 arquivos, ~78 chamadas):**

- `src/lib/supabase/trips.ts` (13 chamadas)
- `src/lib/supabase/expenses.ts` (9 chamadas)
- `src/lib/supabase/budgets.ts` (9 chamadas)
- `src/lib/supabase/activities.ts` (8 chamadas)
- `src/lib/supabase/invites.ts` (7 chamadas)
- `src/lib/supabase/notes.ts` (6 chamadas)
- `src/lib/supabase/profile.ts` (6 chamadas)
- `src/lib/supabase/checklists.ts` (5 chamadas)
- `src/lib/supabase/settlements.ts` (4 chamadas)
- `src/lib/supabase/attachments.ts` (4 chamadas)
- `src/lib/supabase/receipts.ts` (4 chamadas)
- `src/lib/supabase/polls.ts` (2 chamadas)
- `src/lib/supabase/email-preferences.ts` (1 chamada)

**Verificação:**

```bash
npm run lint && npm run build && npm test
# Verificar que não restam revalidatePath diretos:
grep -rn "revalidatePath(" src/lib/supabase/ --include="*.ts" | grep -v "revalidation.ts"
```

**Commit:**

```bash
git commit -m "refactor: centralize all revalidatePath calls into revalidation module"
```

---

### Task 6: Verificação final da Fase 1

```bash
npm test && npm run lint && npm run build
```

**Verificações extras:**

```bash
# Zero rotas hardcoded em componentes:
grep -rn "'/trip/" src/ --include="*.tsx" | grep -v routes | grep -v node_modules | wc -l
# Deve retornar 0

# Zero revalidatePath diretos em server actions:
grep -rn "revalidatePath(" src/lib/supabase/ | grep -v revalidation | wc -l
# Deve retornar 0
```

**Commit:**

```bash
git commit -m "chore: phase 1 complete - architecture foundation verified"
```
