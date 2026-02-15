# Fase 2: Engine de Formulários Unificada — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminar ~1000 linhas de código duplicado em formulários, criar hooks e componentes reutilizáveis, unificar despesas (create+edit) num único dialog, e corrigir problemas de acessibilidade.

**Architecture:** Extract-then-replace. Criar hooks e componentes novos primeiro, depois migrar formulários existentes para usá-los. Não quebrar funcionalidade durante migração.

**Tech Stack:** React 19, react-hook-form, Zod, shadcn/ui, Radix UI

---

### Task 1: Criar hook `useDialogState`

**Files:**

- Create: `src/hooks/use-dialog-state.ts`

**Contexto:** Padrão controlado/não-controlado repetido em 10+ dialogs (~20 linhas cada):

```tsx
// Repetido em: add-expense-dialog, create-trip-dialog, add-activity-dialog, add-note-dialog, etc.
const [internalOpen, setInternalOpen] = useState(false);
const isControlled = controlledOpen !== undefined;
const open = isControlled ? controlledOpen : internalOpen;
const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
```

**Implementação:**

```typescript
'use client';

import { useState, useCallback } from 'react';

interface UseDialogStateOptions {
  controlledOpen?: boolean;
  controlledOnOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function useDialogState({
  controlledOpen,
  controlledOnOpenChange,
  onClose,
}: UseDialogStateOptions = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        onClose?.();
      }
    },
    [setOpen, onClose]
  );

  return { open, setOpen, handleOpenChange };
}
```

**Commit:**

```bash
git add src/hooks/use-dialog-state.ts
git commit -m "feat: extract useDialogState hook for controlled/uncontrolled dialog pattern"
```

---

### Task 2: Criar hook `useFormSubmission`

**Files:**

- Create: `src/hooks/use-form-submission.ts`

**Contexto:** Boilerplate de submit repetido em 15+ forms (~30-40 linhas cada):

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);
const onSubmit = async (data) => {
  setIsSubmitting(true);
  try {
    const result = await createX(data);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('X adicionado!');
    setOpen(false);
    form.reset();
    onSuccess?.();
  } catch {
    toast.error('Erro ao adicionar X');
  } finally {
    setIsSubmitting(false);
  }
};
```

**Implementação:**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface SubmitOptions<TResult> {
  successMessage: string;
  errorMessage?: string;
  onSuccess?: (result: TResult) => void;
  onError?: (error: string) => void;
  resetForm?: () => void;
  closeDialog?: () => void;
}

export function useFormSubmission<TData, TResult extends { error?: string }>(
  submitFn: (data: TData) => Promise<TResult>,
  options: SubmitOptions<TResult>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (data: TData) => {
      setIsSubmitting(true);
      try {
        const result = await submitFn(data);
        if (result.error) {
          toast.error(result.error);
          options.onError?.(result.error);
          return;
        }
        toast.success(options.successMessage);
        options.closeDialog?.();
        options.resetForm?.();
        options.onSuccess?.(result);
      } catch {
        toast.error(options.errorMessage ?? 'Erro inesperado. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [submitFn, options]
  );

  return { isSubmitting, handleSubmit };
}
```

**Commit:**

```bash
git add src/hooks/use-form-submission.ts
git commit -m "feat: extract useFormSubmission hook for form submit boilerplate"
```

---

### Task 3: Criar hook `useExpenseSplits`

**Files:**

- Create: `src/hooks/use-expense-splits.ts`

**Contexto:** Lógica de cálculo de splits duplicada entre `add-expense-dialog.tsx` (linhas 138-165) e `expense-form.tsx` (linhas 113-156). ~43 linhas cada, quase idênticas.

**Implementação:**

```typescript
'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  parseAmount,
  formatAmount,
  calculateEqualSplits,
  calculateAmountSplits,
  calculatePercentageSplits,
  validateSplitsTotal,
  validatePercentagesTotal,
} from '@/lib/validation/expense-schemas';
import type { ExpenseFormValues } from '@/lib/validation/expense-schemas';

type SplitType = 'equal' | 'by_amount' | 'by_percentage';

interface SplitResult {
  splits: { user_id: string; amount: number; percentage?: number }[];
  amount: number;
  exchangeRate: number;
}

export function useExpenseSplits(baseCurrency: string) {
  const calculateSplits = useCallback(
    (data: ExpenseFormValues): SplitResult | null => {
      const amount = parseAmount(data.amount);
      if (amount <= 0) {
        toast.error('Valor deve ser maior que zero');
        return null;
      }

      const exchangeRate = data.exchange_rate ? parseAmount(data.exchange_rate) : 1;
      if (data.currency !== baseCurrency && exchangeRate <= 0) {
        toast.error('Taxa de câmbio deve ser maior que zero');
        return null;
      }

      const splitType = data.split_type as SplitType;
      let splits;

      if (splitType === 'equal') {
        splits = calculateEqualSplits(amount, data.selected_members);
      } else if (splitType === 'by_amount') {
        splits = calculateAmountSplits(amount, data.custom_amounts || {}, data.selected_members);
        const validation = validateSplitsTotal(splits, amount);
        if (!validation.valid) {
          toast.error(
            `A soma das divisões difere do total em ${formatAmount(Math.abs(validation.difference), data.currency)}`
          );
          return null;
        }
      } else {
        splits = calculatePercentageSplits(
          amount,
          data.custom_percentages || {},
          data.selected_members
        );
        const validation = validatePercentagesTotal(
          data.custom_percentages || {},
          data.selected_members
        );
        if (!validation.valid) {
          toast.error(
            `A soma dos percentuais difere de 100% em ${validation.difference.toFixed(1)}%`
          );
          return null;
        }
      }

      return { splits, amount, exchangeRate };
    },
    [baseCurrency]
  );

  return { calculateSplits };
}
```

**Commit:**

```bash
git add src/hooks/use-expense-splits.ts
git commit -m "feat: extract useExpenseSplits hook for split calculation logic"
```

---

### Task 4: Criar componente `MemberSplitSelector`

**Files:**

- Create: `src/components/forms/member-split-selector.tsx`

**Contexto:** UI de seleção de membros + amounts/percentages duplicada (~85 linhas cada) entre `add-expense-dialog.tsx` e `expense-form.tsx`.

**Implementação:**
Extrair a lógica de:

- Checkbox list de membros
- Inputs condicionais de amount (split_type === 'by_amount')
- Inputs condicionais de percentage (split_type === 'by_percentage')
- Resumo de split (total, diferença)

Props interface:

```typescript
interface MemberSplitSelectorProps {
  members: TripMemberWithUser[];
  splitType: 'equal' | 'by_amount' | 'by_percentage';
  selectedMembers: string[];
  onSelectedMembersChange: (members: string[]) => void;
  customAmounts?: Record<string, string>;
  onCustomAmountsChange?: (amounts: Record<string, string>) => void;
  customPercentages?: Record<string, string>;
  onCustomPercentagesChange?: (percentages: Record<string, string>) => void;
  currency: string;
  totalAmount: string;
  idPrefix?: string; // Para evitar conflitos de ID entre dialogs
}
```

**Commit:**

```bash
git add src/components/forms/member-split-selector.tsx
git commit -m "feat: create MemberSplitSelector shared component"
```

---

### Task 5: Criar componente `CurrencyAmountInput`

**Files:**

- Create: `src/components/forms/currency-amount-input.tsx`

**Contexto:** Input de valor com moeda + câmbio usado em ambos formulários de despesa.

**Props:**

```typescript
interface CurrencyAmountInputProps {
  form: UseFormReturn<ExpenseFormValues>;
  baseCurrency: string;
  currencies?: string[];
}
```

**Reutiliza:** `src/hooks/use-currency-input.ts` → `useCurrencyInputMulti()` (já existe, 227 linhas)

**Commit:**

```bash
git add src/components/forms/currency-amount-input.tsx
git commit -m "feat: create CurrencyAmountInput shared component"
```

---

### Task 6: Unificar AddExpenseDialog para suportar edição

**Files:**

- Modify: `src/components/expenses/add-expense-dialog.tsx` (adicionar prop `expense?` para modo edição)
- Modify: `src/app/(app)/trip/[id]/expenses/expenses-list.tsx` (usar dialog para edição em vez de rota)
- Modify: Integrar hooks (Tasks 1-3) e componentes (Tasks 4-5) no dialog unificado

**Estratégia:**

1. Adicionar prop `expense?: ExpenseWithDetails` ao `AddExpenseDialogProps`
2. Quando `expense` passado:
   - `defaultValues` pré-preenchidos com dados da despesa
   - `onSubmit` chama `updateExpense()` em vez de `createExpense()`
   - Título muda de "Adicionar despesa" para "Editar despesa"
3. Substituir lógica inline pelos hooks extraídos
4. Substituir UI duplicada pelos componentes extraídos

**Em expenses-list.tsx:**

```tsx
const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);

// No ExpenseCard:
onEdit={() => setEditingExpense(expense)}

// Após AddExpenseDialog existente:
{editingExpense && (
  <AddExpenseDialog
    tripId={tripId}
    members={members}
    currentUserId={currentUserId}
    baseCurrency={baseCurrency}
    expense={editingExpense}
    open={!!editingExpense}
    onOpenChange={(open) => !open && setEditingExpense(null)}
    onSuccess={handleExpenseAdded}
  />
)}
```

**Após unificação:**

- Remover `src/components/expenses/expense-form.tsx` (page form standalone)
- Remover rota `/expenses/[expenseId]/edit` (criada em Phase 0)
- Remover rota `/expenses/add` (se existir)
- O dialog unificado é a única UI de despesa

**Commit:**

```bash
git commit -m "feat: unify expense forms - AddExpenseDialog now supports create and edit modes"
git commit -m "refactor: remove standalone ExpenseForm and edit page route"
```

---

### Task 7: Unificar file upload

**Files:**

- Create: `src/components/forms/unified-file-upload.tsx`
- Modify: `src/components/receipts/receipt-upload.tsx` (redirecionar para unified)
- Modify: `src/components/attachments/file-upload.tsx` (redirecionar para unified)

**Diferenças entre os dois:**

- `receipt-upload.tsx`: Single file, tem camera capture, props (tripId, expenseId, onUploadComplete)
- `file-upload.tsx`: Multiple files, sem camera, props (activityId, onUploadComplete)

**Componente unificado:**

```typescript
interface UnifiedFileUploadProps {
  onUploadComplete: (urls: string[]) => void;
  disabled?: boolean;
  maxFiles?: number; // 1 para receipt, N para attachments
  maxSizeBytes?: number;
  allowedTypes?: string[];
  enableCamera?: boolean; // true para receipts
  className?: string;
}
```

**Commit:**

```bash
git commit -m "feat: create unified file upload component replacing receipt-upload and file-upload"
```

---

### Task 8: Corrigir acessibilidade de formulários

**Files a modificar:**

1. **`<span onClick>` → `<button>`**:
   - `src/components/trips/create-trip-dialog.tsx` — trigger wrapper já usa `<button>`, verificar se correto
   - `src/components/activities/add-activity-dialog.tsx` — mesma verificação
   - Garantir que todos os triggers são `<button type="button">` ou usam Radix trigger

2. **`aria-hidden` em ícones decorativos**:
   - `src/components/expenses/expense-card.tsx:127` — Pencil icon faltando `aria-hidden="true"`

3. **`aria-required` em campos obrigatórios**:
   - `src/components/activities/activity-form-fields.tsx` — 3 campos com RequiredMark mas sem `aria-required`

4. **Keyboard nav no LocationAutocomplete**:
   - `src/components/activities/location-autocomplete.tsx` (linhas 221-248)
   - Adicionar `onKeyDown` handler para Arrow Up/Down/Enter/Escape
   - Adicionar `aria-activedescendant` para rastrear item selecionado
   - Adicionar `tabIndex={0}` nos items

**Commit:**

```bash
git commit -m "fix: improve form accessibility - keyboard nav, aria-required, semantic triggers"
```

---

### Task 9: Migrar outros dialogs para usar hooks compartilhados

**Dialogs a migrar (substituir boilerplate por hooks):**

- `src/components/trips/create-trip-dialog.tsx` → `useDialogState` + `useFormSubmission`
- `src/components/trips/edit-trip-dialog.tsx` → `useDialogState` + `useFormSubmission`
- `src/components/activities/add-activity-dialog.tsx` → `useDialogState` + `useFormSubmission`
- `src/components/activities/edit-activity-dialog.tsx` → `useDialogState` + `useFormSubmission`
- `src/components/notes/add-note-dialog.tsx` → `useDialogState` + `useFormSubmission`
- `src/components/budget/budget-form-dialog.tsx` → `useDialogState` + `useFormSubmission`
- `src/components/checklists/checklist-form-dialog.tsx` → `useDialogState` + `useFormSubmission`
- `src/components/polls/create-poll-dialog.tsx` → `useDialogState` + `useFormSubmission`
- `src/components/invites/invite-dialog.tsx` → `useDialogState` + `useFormSubmission`

**Padrão de migração por dialog (~10 min cada):**

Antes:

```tsx
const [internalOpen, setInternalOpen] = useState(false);
const isControlled = controlledOpen !== undefined;
const open = isControlled ? controlledOpen : internalOpen;
const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
const [isSubmitting, setIsSubmitting] = useState(false);
```

Depois:

```tsx
const { open, setOpen, handleOpenChange } = useDialogState({
  controlledOpen,
  controlledOnOpenChange: onOpenChange,
  onClose: () => {
    form.reset();
    setStep?.(1);
  },
});
const { isSubmitting, handleSubmit } = useFormSubmission(submitFn, {
  successMessage: 'Criado!',
  closeDialog: () => setOpen(false),
  resetForm: () => form.reset(),
  onSuccess,
});
```

**Commit por batch:**

```bash
git commit -m "refactor: migrate trip dialogs to shared hooks"
git commit -m "refactor: migrate activity dialogs to shared hooks"
git commit -m "refactor: migrate remaining dialogs to shared hooks"
```

---

### Task 10: Verificação final da Fase 2

```bash
npm test && npm run lint && npm run build
```

**Testes manuais:**

1. Criar despesa via dialog → funciona
2. Editar despesa via dialog → funciona (valores pré-preenchidos)
3. Criar viagem → funciona
4. Upload de receipt → funciona
5. Upload de attachment → funciona
6. Keyboard navigation no LocationAutocomplete → funciona

**Commit:**

```bash
git commit -m "chore: phase 2 complete - unified form engine verified"
```
