# Fase 0: Correções Críticas — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir 5 bugs críticos (edição de despesas, role offline, webhook security, health endpoint, FAB overlap) antes da reestruturação radical.

**Architecture:** Correções pontuais sem mudança estrutural. Reutiliza componentes existentes (ExpenseForm, updateExpense, cache.ts). Incrementa versão do Dexie para suportar role offline.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Dexie.js, Zod

---

### Task 1: Implementar edição de despesas

**Files:**

- Modify: `src/app/(app)/trip/[id]/expenses/expenses-list.tsx`
- Modify: `src/components/expenses/expense-card.tsx` (já tem suporte, só confirmar)
- Reutilizar: `src/components/expenses/add-expense-dialog.tsx` (como base)
- Reutilizar: `src/lib/supabase/expenses.ts` → `updateExpense()` (já existe, linha 138)
- Reutilizar: `src/lib/supabase/expenses.ts` → `getExpenseById()` (já existe, linha 425)
- Reutilizar: `src/lib/validation/expense-schemas.ts` → `expenseFormSchema`, helpers

**Contexto:**

- `ExpenseCard` (linha 26-31) já aceita `onEdit?: () => void` e renderiza o botão "Editar" quando passado (linha 125-130)
- `expenses-list.tsx` nunca passa `onEdit` ao ExpenseCard (linha 343-348)
- `ExpenseForm` (539 linhas) já suporta modo edição via prop `expense?: ExpenseWithDetails`
- Mas `ExpenseForm` é full-page Card, não dialog — para Fase 0, vamos criar rota de edição que usa `ExpenseForm`
- `AddExpenseDialog` NÃO suporta edição (sem prop `expense`)

**Abordagem Phase 0 (simples):**
Criar rota `/trip/[id]/expenses/[expenseId]/edit` com page server que busca a despesa e renderiza ExpenseForm em modo edição. No `expenses-list.tsx`, passar `onEdit` que faz `router.push()`.

**Step 1: Criar server page de edição de despesa**

Criar `src/app/(app)/trip/[id]/expenses/[expenseId]/edit/page.tsx`:

```tsx
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getExpenseById } from '@/lib/supabase/expenses';
import { getTripMembers } from '@/lib/supabase/trips';
import { getTripById } from '@/lib/supabase/trips';
import { PageContainer } from '@/components/layout/page-container';
import { ExpenseForm } from '@/components/expenses/expense-form';

interface EditExpensePageProps {
  params: Promise<{ id: string; expenseId: string }>;
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id: tripId, expenseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [trip, expense, members] = await Promise.all([
    getTripById(tripId),
    getExpenseById(expenseId),
    getTripMembers(tripId),
  ]);

  if (!trip || !expense) {
    notFound();
  }

  return (
    <PageContainer>
      <ExpenseForm
        tripId={tripId}
        members={members}
        currentUserId={user.id}
        baseCurrency={trip.base_currency}
        expense={expense}
      />
    </PageContainer>
  );
}
```

**Step 2: Adicionar handler onEdit no expenses-list.tsx**

Em `src/app/(app)/trip/[id]/expenses/expenses-list.tsx`:

Adicionar handler após `handleExpenseDeleted` (linha 91):

```tsx
const handleEditExpense = (expense: ExpenseWithDetails) => {
  router.push(`/trip/${tripId}/expenses/${expense.id}/edit`);
};
```

Modificar renderização do ExpenseCard (linhas 343-348), adicionar `onEdit`:

```tsx
<ExpenseCard
  expense={expense}
  baseCurrency={baseCurrency}
  canEdit={canEditExpense(expense)}
  onEdit={() => handleEditExpense(expense)}
  onDelete={() => setDeletingExpense(expense)}
/>
```

**Step 3: Verificar que ExpenseCard já renderiza botão Editar**

`expense-card.tsx` linhas 125-130 já faz:

```tsx
{
  onEdit && (
    <DropdownMenuItem onClick={onEdit}>
      <Pencil className="mr-2 h-4 w-4" />
      Editar
    </DropdownMenuItem>
  );
}
```

Nenhuma modificação necessária no card.

**Step 4: Testar**

Run: `npm run lint && npm run build`
Expected: Build sem erros

Teste manual: Abrir viagem → Despesas → Menu de despesa → "Editar" → Formulário pré-preenchido → Salvar → Voltar à lista

**Step 5: Commit**

```bash
git add src/app/(app)/trip/[id]/expenses/[expenseId]/edit/page.tsx src/app/(app)/trip/[id]/expenses/expenses-list.tsx
git commit -m "feat: implement expense edit flow via dedicated edit page"
```

---

### Task 2: Corrigir detecção de role offline

**Files:**

- Modify: `src/app/(app)/trips/trips-list.tsx` (linhas 56-67)
- Reutilizar: `src/lib/sync/cache.ts` → `getCachedTripMembers()` (já existe, linha 83)

**Contexto:**

- Quando offline, `trips-list.tsx:63-67` cria `TripWithMembers` com `trip_members: []`
- `getUserRole()` (linha 136-140) busca membro em `trip_members` → sempre retorna `null` offline
- Mas `trip_members` JÁ são cacheados no Dexie via `cacheTripMembers()` (cache.ts:74-81)
- `getCachedTripMembers(tripId)` retorna `CachedTripMember[]` com campo `role`
- Não precisa mudar schema Dexie — os dados já estão lá, só falta buscá-los

**Step 1: Modificar lógica offline em trips-list.tsx**

Adicionar import:

```tsx
import { getCachedTripMembers } from '@/lib/sync/cache';
```

Substituir linhas 62-67 (bloco offline) por:

```tsx
const cachedTrips = await getCachedUserTrips(userId);

// Fetch cached members for each trip to preserve role detection
const tripsWithMembers: TripWithMembers[] = await Promise.all(
  cachedTrips.map(async (trip) => {
    const cachedMembers = await getCachedTripMembers(trip.id);
    return {
      ...trip,
      trip_members: cachedMembers.map((m) => ({
        id: m.id,
        trip_id: m.trip_id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        invited_by: m.invited_by,
      })),
      memberCount: cachedMembers.length,
    };
  })
);
```

**Step 2: Testar**

Run: `npm run lint && npm run build`
Expected: Build sem erros

Teste manual: Desconectar rede → Recarregar /trips → Verificar que role do usuário aparece corretamente

**Step 3: Commit**

```bash
git add src/app/(app)/trips/trips-list.tsx
git commit -m "fix: preserve user role detection in offline mode using cached trip members"
```

---

### Task 3: Fortalecer webhook Resend com timing-safe comparison

**Files:**

- Modify: `src/app/api/webhooks/resend/route.ts` (linhas 24-27 e 39-62)

**Contexto:**

- Linha 26: Compara assinatura com `===` (vulnerável a timing attack)
- Linha 51-62: Se `RESEND_WEBHOOK_SECRET` não está configurado, pula validação

**Step 1: Usar timingSafeEqual na comparação de assinatura**

Modificar função `verifyWebhookSignature` (linhas 22-31):

Substituir linhas 24-28:

```typescript
const signatures = svixSignature.split(' ');
for (const sig of signatures) {
  const [version, value] = sig.split(',');
  if (version === 'v1' && value === expectedSignature) {
    return true;
  }
}
```

Por:

```typescript
const signatures = svixSignature.split(' ');
const expectedBuf = Buffer.from(expectedSignature);
for (const sig of signatures) {
  const [version, value] = sig.split(',');
  if (version === 'v1' && value) {
    const valueBuf = Buffer.from(value);
    if (expectedBuf.length === valueBuf.length && crypto.timingSafeEqual(expectedBuf, valueBuf)) {
      return true;
    }
  }
}
```

**Step 2: Rejeitar requests quando secret não configurado em produção**

Após linha 51 (`if (webhookSecret) {`), adicionar else block:

```typescript
    } else if (process.env.NODE_ENV === 'production') {
      console.error('RESEND_WEBHOOK_SECRET not configured in production');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }
```

**Step 3: Testar**

Run: `npm run lint && npm run build`
Expected: Build sem erros

**Step 4: Commit**

```bash
git add src/app/api/webhooks/resend/route.ts
git commit -m "fix: use timing-safe comparison for webhook signature and require secret in production"
```

---

### Task 4: Endurecer endpoint de health

**Files:**

- Modify: `src/app/api/health/route.ts` (linhas 38-49)

**Step 1: Remover informações sensíveis da resposta**

Substituir resposta de sucesso (linhas 38-49):

```typescript
return NextResponse.json(
  {
    status,
    timestamp: new Date().toISOString(),
    responseTime,
    checks: {
      database: databaseHealthy,
    },
  },
  { status: statusCode }
);
```

Remover `version` (já feito no código acima — a versão `process.env.NEXT_PUBLIC_APP_VERSION` é removida).

**Step 2: Testar**

Run: `npm run lint && npm run build`
Expected: Build sem erros

Teste: `curl http://localhost:3000/api/health` — não deve conter campo `version`

**Step 3: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "fix: remove version exposure from health endpoint"
```

---

### Task 5: Corrigir overlap FAB vs Install Prompt

**Files:**

- Modify: `src/components/pwa/install-prompt.tsx` (linha 69)

**Contexto:**

- Install prompt: `fixed bottom-20` (80px do bottom)
- FAB: `fixed bottom-24` (96px do bottom) — definido em `src/components/ui/fab.tsx:22`
- No mobile, ambos ocupam a mesma zona visual
- Bottom nav: `fixed bottom-0` com `h-16` (64px)

**Step 1: Mover Install Prompt acima do FAB**

Em `src/components/pwa/install-prompt.tsx`, linha 69, alterar:

```
bottom-20 left-4 right-4 z-50
```

Para:

```
bottom-28 left-4 right-4 z-50
```

Isso move o prompt de 80px para 112px do bottom, ficando acima do FAB (96px).

**Step 2: Testar**

Run: `npm run build`
Expected: Build sem erros

Teste visual: Abrir app mobile → Verificar que prompt PWA e FAB não sobrepõem

**Step 3: Commit**

```bash
git add src/components/pwa/install-prompt.tsx
git commit -m "fix: prevent install prompt from overlapping with FAB on mobile"
```

---

### Task 6: Verificação final da Fase 0

**Step 1: Rodar suite completa**

```bash
npm test && npm run lint && npm run build
```

Expected: 266+ testes passando, zero erros lint, build limpo

**Step 2: Commit final (se houver ajustes)**

```bash
git add -A && git commit -m "chore: phase 0 complete - critical fixes verified"
```
