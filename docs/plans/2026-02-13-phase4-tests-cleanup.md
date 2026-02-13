# Fase 4: Testes e Limpeza — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Garantir que toda a reestruturação funciona corretamente com testes, limpar console logging, e fazer verificação final.

**Architecture:** Testes unitários para novos hooks, limpeza de código legado, verificação end-to-end.

**Tech Stack:** Vitest, Playwright (e2e), TypeScript

---

### Task 1: Testes para novos hooks

**Files:**

- Create: `src/hooks/__tests__/use-dialog-state.test.ts`
- Create: `src/hooks/__tests__/use-form-submission.test.ts`
- Create: `src/hooks/__tests__/use-expense-splits.test.ts`

**Testes para useDialogState:**

```typescript
import { renderHook, act } from '@testing-library/react';
import { useDialogState } from '../use-dialog-state';

describe('useDialogState', () => {
  it('manages internal state when uncontrolled', () => {
    const { result } = renderHook(() => useDialogState());
    expect(result.current.open).toBe(false);
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });

  it('uses controlled state when provided', () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useDialogState({ controlledOpen: true, controlledOnOpenChange: onOpenChange })
    );
    expect(result.current.open).toBe(true);
    act(() => result.current.setOpen(false));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onClose when dialog closes', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDialogState({ onClose }));
    act(() => result.current.handleOpenChange(true));
    act(() => result.current.handleOpenChange(false));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

**Testes para useExpenseSplits:**

```typescript
import { renderHook } from '@testing-library/react';
import { useExpenseSplits } from '../use-expense-splits';

describe('useExpenseSplits', () => {
  it('calculates equal splits correctly', () => {
    const { result } = renderHook(() => useExpenseSplits('BRL'));
    const splits = result.current.calculateSplits({
      amount: '100,00',
      currency: 'BRL',
      split_type: 'equal',
      selected_members: ['user1', 'user2'],
      // ... outros campos obrigatórios
    });
    expect(splits).not.toBeNull();
    expect(splits!.splits).toHaveLength(2);
    expect(splits!.splits[0].amount + splits!.splits[1].amount).toBe(100);
  });

  it('rejects zero amount', () => {
    const { result } = renderHook(() => useExpenseSplits('BRL'));
    const splits = result.current.calculateSplits({
      amount: '0',
      currency: 'BRL',
      split_type: 'equal',
      selected_members: ['user1'],
    });
    expect(splits).toBeNull();
  });
});
```

**Commit:**

```bash
git commit -m "test: add unit tests for shared form hooks"
```

---

### Task 2: Testes para componentes de form

**Files:**

- Create: `src/components/forms/__tests__/member-split-selector.test.tsx`

**Testes básicos:**

- Renderiza lista de membros
- Selecionar/deselecionar membros
- Inputs de custom amount aparecem quando split_type === 'by_amount'
- Inputs de custom percentage aparecem quando split_type === 'by_percentage'

**Commit:**

```bash
git commit -m "test: add unit tests for MemberSplitSelector component"
```

---

### Task 3: Limpar console logging

**Problema:** 99+ console statements em 28 arquivos

**Abordagem:**

1. Listar todos os console statements:

   ```bash
   grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test."
   ```

2. Para cada ocorrência, decidir:
   - **Remover**: Logs de debug que não servem mais
   - **Substituir**: Erros importantes → `logError()` de `src/lib/errors/logger.ts`
   - **Manter**: `console.error` em catch blocks críticos (webhook, auth)

3. Padrão:

   ```typescript
   // Antes:
   console.error('Failed to create expense:', error);

   // Depois:
   import { logError } from '@/lib/errors/logger';
   logError(error instanceof Error ? error : new Error(String(error)), {
     action: 'createExpense',
     tripId,
   });
   ```

**Commit:**

```bash
git commit -m "chore: replace console statements with structured logger"
```

---

### Task 4: Remover código morto

**Verificar e remover:**

1. `src/components/expenses/expense-form.tsx` — Se já foi substituído pelo dialog unificado (Fase 2 Task 6)
2. `src/app/(app)/trip/[id]/expenses/[expenseId]/edit/page.tsx` — Se já foi substituído pelo dialog (Fase 2 Task 6)
3. `src/app/(app)/trip/[id]/expenses/add/page.tsx` — Se existir e não for mais usado
4. Imports não usados detectados pelo lint

**Commit:**

```bash
git commit -m "chore: remove dead code and unused components"
```

---

### Task 5: Atualizar testes existentes

**Se testes quebraram durante reestruturação:**

1. Atualizar imports de rotas para usar `routes.*`
2. Atualizar mocks de componentes removidos
3. Atualizar expectativas de revalidatePath (agora usa `revalidate.*`)

```bash
npm test -- --reporter=verbose
```

**Corrigir qualquer teste falhando.**

**Commit:**

```bash
git commit -m "test: fix existing tests for new architecture"
```

---

### Task 6: Verificação final completa

**Step 1: Suite completa**

```bash
npm test && npm run lint && npm run build
```

Expected: Todos os testes passando, zero erros lint, build limpo.

**Step 2: Verificações de completude**

```bash
# Zero rotas hardcoded:
grep -rn "'/trip/" src/ --include="*.tsx" --include="*.ts" | grep -v routes | grep -v node_modules | grep -v ".test." | wc -l

# Zero revalidatePath diretos em server actions:
grep -rn "revalidatePath(" src/lib/supabase/ --include="*.ts" | grep -v revalidation | wc -l

# Console statements restantes (deve ser <10):
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test." | wc -l
```

**Step 3: Testes E2E (se disponíveis)**

```bash
npx playwright test
```

**Step 4: Lighthouse (manual)**

- Abrir app em Chrome DevTools
- Run Lighthouse audit
- Verificar que scores não regrediram

**Step 5: Commit final**

```bash
git commit -m "chore: phase 4 complete - all tests passing, cleanup verified"
```

---

### Resumo de métricas finais esperadas

| Verificação              | Target               |
| ------------------------ | -------------------- |
| `npm test`               | 270+ testes passando |
| `npm run lint`           | 0 erros              |
| `npm run build`          | Build limpo          |
| Rotas hardcoded          | 0                    |
| revalidatePath diretos   | 0                    |
| Console statements       | <10                  |
| Testes novos adicionados | ~15-20               |
