# UX/UI Improvement — Phases 2-4: Components, Forms & Polish

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build reusable design system components (AvatarSelector, SwipeAction, enhanced EmptyState, enhanced MoneyDisplay), then use them to improve form flows (activity bottom sheet, expense 2-step, trip wizard, currency input fix), and finally add microinteractions and polish (FAB, swipe-to-delete, offline indicator, cover images, pull-to-refresh, reduced-motion).

**Architecture:** Phase 2 builds the foundation components. Phase 3 restructures forms using those components plus a new ResponsiveFormContainer (Dialog on desktop, BottomSheet on mobile). Phase 4 adds polish layers. All animations respect `prefersReducedMotion()` from `src/lib/utils/accessibility.ts`. All text in Portuguese (pt-BR).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, vaul (bottom sheet), Radix UI (tooltip, avatar, alert-dialog), react-hook-form + Zod, Supabase Storage, touch events API

---

# PHASE 2: Design System Components

---

## Task 1: Create AvatarSelector component

**Files:**

- Create: `src/components/ui/avatar-selector.tsx`
- Test: `src/components/ui/avatar-selector.test.tsx`

**Step 1: Write the test**

```tsx
// src/components/ui/avatar-selector.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AvatarSelector } from './avatar-selector';

const participants = [
  { id: 'u1', name: 'Alice', avatar_url: null },
  { id: 'u2', name: 'Bob', avatar_url: null },
  { id: 'u3', name: 'Carol', avatar_url: null },
];

describe('AvatarSelector', () => {
  it('renders all participants', () => {
    render(<AvatarSelector participants={participants} selected="u1" onSelect={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('marks selected participant with aria-checked', () => {
    render(<AvatarSelector participants={participants} selected="u1" onSelect={vi.fn()} />);
    const selected = screen.getByRole('radio', { name: /alice/i });
    expect(selected).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onSelect when clicking a participant', () => {
    const onSelect = vi.fn();
    render(<AvatarSelector participants={participants} selected="u1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('radio', { name: /bob/i }));
    expect(onSelect).toHaveBeenCalledWith('u2');
  });

  it('has radiogroup role on container', () => {
    render(<AvatarSelector participants={participants} selected="u1" onSelect={vi.fn()} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('navigates with arrow keys', () => {
    const onSelect = vi.fn();
    render(<AvatarSelector participants={participants} selected="u1" onSelect={onSelect} />);
    const first = screen.getByRole('radio', { name: /alice/i });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('u2');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/avatar-selector.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the AvatarSelector component**

Uses `Avatar`, `AvatarFallback`, `AvatarImage` from `src/components/ui/avatar.tsx`. Roving tabindex pattern for keyboard navigation.

```tsx
// src/components/ui/avatar-selector.tsx
'use client';

import { useCallback, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface AvatarSelectorProps {
  participants: Participant[];
  selected: string;
  onSelect: (id: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

const sizeClasses = {
  sm: { avatar: 'size-8', text: 'text-xs' },
  md: { avatar: 'size-10', text: 'text-sm' },
};

export function AvatarSelector({
  participants,
  selected,
  onSelect,
  size = 'md',
  className,
}: AvatarSelectorProps) {
  const itemsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const s = sizeClasses[size];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentId: string) => {
      const idx = participants.findIndex((p) => p.id === currentId);
      let next = idx;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = (idx + 1) % participants.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = (idx - 1 + participants.length) % participants.length;
      } else return;

      const nextId = participants[next].id;
      onSelect(nextId);
      itemsRef.current.get(nextId)?.focus();
    },
    [participants, onSelect]
  );

  return (
    <div
      role="radiogroup"
      aria-label="Selecionar participante"
      className={cn('flex gap-3 overflow-x-auto pb-1 scrollbar-none', className)}
    >
      {participants.map((p) => {
        const isSelected = p.id === selected;
        return (
          <button
            key={p.id}
            ref={(el) => {
              if (el) itemsRef.current.set(p.id, el);
              else itemsRef.current.delete(p.id);
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={p.name}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(p.id)}
            onKeyDown={(e) => handleKeyDown(e, p.id)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-75'
            )}
          >
            <Avatar
              className={cn(
                s.avatar,
                'transition-all',
                isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
            >
              {p.avatar_url && <AvatarImage src={p.avatar_url} alt="" />}
              <AvatarFallback className={s.text}>{getInitials(p.name)}</AvatarFallback>
            </Avatar>
            <span className={cn('max-w-14 truncate', s.text)}>{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/avatar-selector.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ui/avatar-selector.tsx src/components/ui/avatar-selector.test.tsx
git commit -m "feat: add AvatarSelector component with keyboard navigation and a11y"
```

---

## Task 2: Create SwipeAction component

**Files:**

- Create: `src/components/ui/swipe-action.tsx`

**Step 1: Create the SwipeAction component**

Uses native touch events. Swipe left reveals destructive background. Threshold at 30% triggers AlertDialog confirmation. Desktop passthrough. Respects `prefersReducedMotion()`.

Reuses: `AlertDialog*` from `src/components/ui/alert-dialog.tsx`, `prefersReducedMotion` from `src/lib/utils/accessibility.ts`, `Trash2` from lucide-react.

```tsx
// src/components/ui/swipe-action.tsx
'use client';

import { useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { prefersReducedMotion } from '@/lib/utils/accessibility';
import { cn } from '@/lib/utils';

interface SwipeActionProps {
  children: React.ReactNode;
  onDelete: () => void;
  confirmMessage?: string;
  confirmTitle?: string;
  disabled?: boolean;
  className?: string;
}

export function SwipeAction({
  children,
  onDelete,
  confirmMessage = 'Esta ação não pode ser desfeita.',
  confirmTitle = 'Confirmar exclusão',
  disabled = false,
  className,
}: SwipeActionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const swipingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const reducedMotion = typeof window !== 'undefined' && prefersReducedMotion();

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      swipingRef.current = false;
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const deltaX = e.touches[0].clientX - startXRef.current;
      const deltaY = e.touches[0].clientY - startYRef.current;
      if (!swipingRef.current && Math.abs(deltaY) > Math.abs(deltaX)) return;
      swipingRef.current = true;
      if (!reducedMotion) setOffset(Math.min(0, deltaX));
    },
    [disabled, reducedMotion]
  );

  const handleTouchEnd = useCallback(() => {
    if (disabled || !swipingRef.current) return;
    const width = containerRef.current?.offsetWidth || 300;
    if (Math.abs(offset) > width * 0.3) setShowConfirm(true);
    setOffset(0);
    swipingRef.current = false;
  }, [disabled, offset]);

  return (
    <>
      <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
        <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive text-destructive-foreground">
          <Trash2 className="size-5" aria-hidden="true" />
        </div>
        <div
          className={cn(
            'relative z-10 bg-background',
            !reducedMotion && offset === 0 && 'transition-transform duration-200'
          )}
          style={{ transform: `translateX(${offset}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>
      </div>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirm(false);
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/swipe-action.tsx
git commit -m "feat: add SwipeAction component with touch gestures and confirm dialog"
```

---

## Task 3: Enhance EmptyState with illustrations and tips

**Files:**

- Modify: `src/components/ui/empty-state.tsx`
- Create: `src/components/illustrations/empty-trips.tsx` (and 5 more)
- Create: `src/components/illustrations/index.ts`

**Step 1: Extend EmptyState component (backward compatible)**

Add optional props: `illustration?: ReactNode`, `tips?: string[]`, `tipTitle?: string`. When `illustration` is provided, it replaces the icon circle. Tips section renders below description as a subtle card with Lightbulb icon.

Current code to preserve (lines 16-33 of `src/components/ui/empty-state.tsx`):

- Keep all existing props working
- Add `Lightbulb` import from lucide-react
- New `illustration` prop: when present, render it in a 48x48 container instead of the icon circle
- New `tips` prop: render as `<ul>` inside a subtle muted card below the action button

**Step 2: Create 6 SVG illustration components**

In `src/components/illustrations/`, create minimal line-art SVGs using `currentColor` with Tailwind color classes (`text-primary/60`, `text-muted-foreground/40`):

- `empty-trips.tsx` — suitcase with handle and wheels
- `empty-expenses.tsx` — wallet with coins
- `empty-activities.tsx` — compass with cardinal directions
- `empty-checklists.tsx` — list with checkmarks
- `empty-budget.tsx` — pie chart segments
- `empty-notes.tsx` — notebook with lines

Export all from `src/components/illustrations/index.ts`.

**Step 3: Update existing empty state usages**

Add `illustration` and `tips` props to existing `<EmptyState>` calls in:

- `src/app/(app)/trips/page.tsx`
- `src/app/(app)/trip/[id]/budget/budget-content.tsx`
- `src/app/(app)/trip/[id]/checklists/checklists-content.tsx`
- `src/app/(app)/trip/[id]/notes/notes-list.tsx`
- `src/app/(app)/trip/[id]/balance/balance-content.tsx`

**Step 4: Run lint and tests**

Run: `npm test && npm run lint`
Expected: PASS (backward compatible)

**Step 5: Commit**

```bash
git add src/components/ui/empty-state.tsx src/components/illustrations/
git add -A  # modified pages
git commit -m "feat: enhance EmptyState with illustrations and contextual tips"
```

---

## Task 4: Enhance MoneyDisplay with animation and conversion tooltip

**Files:**

- Modify: `src/components/ui/money-display.tsx`
- Test: `src/components/ui/money-display.test.tsx`

**Step 1: Write the test**

```tsx
// src/components/ui/money-display.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyDisplay } from './money-display';

vi.mock('@/lib/utils/accessibility', () => ({ prefersReducedMotion: () => true }));

describe('MoneyDisplay', () => {
  it('renders formatted currency', () => {
    render(<MoneyDisplay amount={100} currency="BRL" />);
    expect(screen.getByText(/R\$/)).toBeInTheDocument();
  });

  it('shows positive color when colorBySign', () => {
    const { container } = render(<MoneyDisplay amount={50} colorBySign />);
    expect(container.firstChild).toHaveClass('text-positive');
  });

  it('shows negative color when colorBySign', () => {
    const { container } = render(<MoneyDisplay amount={-50} colorBySign />);
    expect(container.firstChild).toHaveClass('text-negative');
  });

  it('renders tooltip when convertedAmount provided', () => {
    render(
      <MoneyDisplay amount={100} currency="USD" convertedAmount={578} convertedCurrency="BRL" />
    );
    expect(screen.getByText(/US\$/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test — expect FAIL** (convertedAmount prop doesn't exist)

**Step 3: Implement enhanced MoneyDisplay**

Add `'use client'` directive (needed for hooks). Add `useAnimatedValue` custom hook that interpolates using `requestAnimationFrame` with ease-out cubic (300ms). Respects `prefersReducedMotion()`.

New props: `convertedAmount?: number`, `convertedCurrency?: string`. When both present, wrap the span in `<Tooltip>` / `<TooltipTrigger>` / `<TooltipContent>` from `src/components/ui/tooltip.tsx`.

Reuses: `formatCurrency` from `src/lib/utils/currency.ts`, `prefersReducedMotion` from `src/lib/utils/accessibility.ts`, Tooltip components from `src/components/ui/tooltip.tsx`.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/ui/money-display.tsx src/components/ui/money-display.test.tsx
git commit -m "feat: add value animation and conversion tooltip to MoneyDisplay"
```

---

## Task 5: Standardize MoneyDisplay usage across the app

**Files to modify:** Replace inline `formatAmount()` / `formatCurrency()` calls in JSX with `<MoneyDisplay>`:

- `src/components/balance/settlements-list.tsx` — settlement amounts (currently uses `formatCurrency` from `@/lib/balance`)
- `src/app/(app)/trip/[id]/budget/budget-content.tsx` — budget amounts
- `src/app/(app)/trip/[id]/trip-overview.tsx` — stat values

**Step 1: Search and replace**

For each file: import `MoneyDisplay`, replace inline formatting with component. Match existing visual with appropriate `size`/`colorBySign`/`showSign` props.

**Step 2: Run full test suite**

Run: `npm test && npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: standardize MoneyDisplay usage across financial components"
```

---

# PHASE 3: Forms and Flows

---

## Task 6: Create useMediaQuery hook and ResponsiveFormContainer

**Files:**

- Create: `src/hooks/use-media-query.ts`
- Create: `src/components/ui/responsive-form-container.tsx`

**Step 1: Create useMediaQuery hook**

```tsx
// src/hooks/use-media-query.ts
'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

**Step 2: Create ResponsiveFormContainer**

Renders `<BottomSheet>` (from `src/components/ui/bottom-sheet.tsx`) on mobile `(max-width: 768px)` and `<Dialog>` on desktop. Unifies props: `open`, `onOpenChange`, `title`, `description`, `children`.

```tsx
// src/components/ui/responsive-form-container.tsx
'use client';

import { useMediaQuery } from '@/hooks/use-media-query';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResponsiveFormContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveFormContainer({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ResponsiveFormContainerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        className={className}
      >
        {children}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className || 'max-h-[90vh] overflow-y-auto sm:max-w-[550px]'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Commit**

```bash
git add src/hooks/use-media-query.ts src/components/ui/responsive-form-container.tsx
git commit -m "feat: add useMediaQuery hook and ResponsiveFormContainer"
```

---

## Task 7: Convert Activity dialog to BottomSheet + Quick Mode

**Files:**

- Modify: `src/components/activities/add-activity-dialog.tsx`
- Modify: `src/components/activities/activity-form-fields.tsx`

**Step 1: Replace Dialog with ResponsiveFormContainer in add-activity-dialog.tsx**

Remove imports: `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle`, `DialogTrigger`.
Add import: `ResponsiveFormContainer` from `@/components/ui/responsive-form-container`.
Add import: `useMediaQuery` from `@/hooks/use-media-query`.

Replace the `dialogContent` variable — remove `<DialogContent>` wrapper and `<DialogHeader>`, use `<ResponsiveFormContainer open={open} onOpenChange={handleOpenChange} title="Adicionar atividade" description="Adicione uma atividade ao roteiro da viagem.">`.

Remove the `<DialogTrigger>` patterns at the bottom. Instead, the trigger (if provided) should set `open` via `onClick`.

Pass `quickMode={isMobile}` to `<ActivityFormFields>`.

**Step 2: Add Quick Mode to activity-form-fields.tsx**

Add `quickMode?: boolean` to `ActivityFormFieldsProps`.
Add `const [expanded, setExpanded] = useState(false)` state.

Fields always shown (quick mode): Title (lines 76-91), Category (lines 94-126), Date+Time (lines 162-194).

Fields behind expand (lines 196-307): Duration, Location, Description, Links. Wrap these in:

```tsx
{
  (!quickMode || expanded) && (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Duration + Location grid */}
      {/* Description */}
      {/* Links section */}
    </div>
  );
}
{
  quickMode && !expanded && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setExpanded(true)}
      className="w-full"
    >
      Mais detalhes
    </Button>
  );
}
```

Transport type (conditional, lines 128-160) stays always visible when category is 'transport'.

**Step 3: Run tests and lint**

Run: `npm test && npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/activities/add-activity-dialog.tsx src/components/activities/activity-form-fields.tsx
git commit -m "feat: activity form uses BottomSheet on mobile with quick mode"
```

---

## Task 8: Expense form 2-step flow

**Files:**

- Modify: `src/components/expenses/add-expense-dialog.tsx`

**Step 1: Add step state and restructure**

Add `const [step, setStep] = useState<1 | 2>(1)` at top. Reset to 1 in `handleOpenChange` when closing.

Replace `<Dialog>` with `<ResponsiveFormContainer>`.

**Step 2: Build Step 1 UI — "Quanto e quem pagou"**

Contents:

- Large centered amount input with `text-3xl text-center font-bold` styling
- Currency selector (small, below amount)
- Exchange rate (conditional, same as current lines 272-300)
- `<AvatarSelector>` replacing the `<Select>` for paid_by (current lines 345-368):
  ```tsx
  const avatarParticipants = members.map((m) => ({
    id: m.user_id,
    name: m.users.name,
    avatar_url: m.users.avatar_url,
  }));
  <AvatarSelector
    participants={avatarParticipants}
    selected={form.watch('paid_by')}
    onSelect={(id) => form.setValue('paid_by', id)}
  />;
  ```
- "Próximo →" button, validates amount > 0 and paid_by before advancing

**Step 3: Build Step 2 UI — "Como dividir"**

Contents: Description, Category, Date, Notes, Split type, Member selection (same JSX from current lines 209-498, minus amount/currency/paid_by).
"← Voltar" + "Salvar" buttons at bottom.

**Step 4: Add step indicator**

Two dots at top of form:

```tsx
<div className="flex justify-center gap-2 py-2">
  <div className={cn('size-2 rounded-full', step === 1 ? 'bg-primary' : 'bg-muted')} />
  <div className={cn('size-2 rounded-full', step === 2 ? 'bg-primary' : 'bg-muted')} />
</div>
```

**Step 5: Run tests and lint**

Run: `npm test && npm run lint`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/expenses/add-expense-dialog.tsx
git commit -m "feat: expense dialog uses 2-step flow with AvatarSelector"
```

---

## Task 9: Trip creation wizard (3 steps)

**Files:**

- Modify: `src/components/trips/create-trip-dialog.tsx`

**Step 1: Add step state and replace Dialog**

Add `const [step, setStep] = useState<1 | 2 | 3>(1)`. Reset to 1 in `handleOpenChange`.

Replace `<Dialog>` + `<DialogTrigger>` + `<DialogContent>` with `<ResponsiveFormContainer>`. The trigger button is handled externally with `onClick`.

**Step 2: Add Progress bar**

Import `Progress` from `src/components/ui/progress.tsx`. Add at top of form:

```tsx
<Progress value={(step / 3) * 100} className="mb-4" />
```

**Step 3: Split form fields into 3 steps**

- Step 1 "Sua viagem" (current lines 143-169): name, destination, description
- Step 2 "Quando" (current lines 171-224): start_date, end_date, style
- Step 3 "Configurações" (current lines 226-274): base_currency, transport_type

Show only fields for current step. Use `{step === N && (...)}` guards.

**Step 4: Per-step validation**

```tsx
const handleNext = async () => {
  let valid = false;
  if (step === 1) valid = await form.trigger(['name', 'destination']);
  if (step === 2) valid = await form.trigger(['start_date', 'end_date']);
  if (valid) setStep((s) => (s + 1) as 2 | 3);
};
```

Step 3 uses `form.handleSubmit(onSubmit)` on "Criar viagem" button.

**Step 5: Navigation buttons per step**

- Step 1: "Próximo →"
- Step 2: "← Voltar" + "Próximo →"
- Step 3: "← Voltar" + "Criar viagem" (submit)

**Step 6: Run tests and lint**

Run: `npm test && npm run lint`
Expected: PASS

**Step 7: Commit**

```bash
git add src/components/trips/create-trip-dialog.tsx
git commit -m "feat: trip creation uses 3-step wizard with progress bar"
```

---

## Task 10: Fix currency input with live formatting and cursor correction

**Files:**

- Create: `src/hooks/use-currency-input.ts`
- Test: `src/hooks/use-currency-input.test.ts`
- Modify: `src/components/expenses/add-expense-dialog.tsx`
- Modify: `src/components/expenses/expense-form.tsx`
- Modify: `src/components/budget/budget-form-dialog.tsx`

**Step 1: Write the test**

```tsx
// src/hooks/use-currency-input.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrencyWithCursor } from './use-currency-input';

describe('formatCurrencyWithCursor', () => {
  it('formats digits as centavos', () => {
    expect(formatCurrencyWithCursor('123', 3)).toEqual({ value: '1,23', cursor: 4 });
  });

  it('handles single digit', () => {
    expect(formatCurrencyWithCursor('5', 1)).toEqual({ value: '0,05', cursor: 4 });
  });

  it('handles two digits', () => {
    expect(formatCurrencyWithCursor('50', 2)).toEqual({ value: '0,50', cursor: 4 });
  });

  it('handles empty string', () => {
    expect(formatCurrencyWithCursor('', 0)).toEqual({ value: '', cursor: 0 });
  });

  it('strips non-digit characters', () => {
    expect(formatCurrencyWithCursor('1a2b3', 5)).toEqual({ value: '1,23', cursor: 4 });
  });

  it('handles large amounts with thousands separator', () => {
    expect(formatCurrencyWithCursor('1500000', 7)).toEqual({ value: '15.000,00', cursor: 9 });
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement the hook**

```tsx
// src/hooks/use-currency-input.ts
'use client';

import { useCallback, useRef } from 'react';

export function formatCurrencyWithCursor(
  raw: string,
  _cursorPos: number
): { value: string; cursor: number } {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { value: '', cursor: 0 };

  const centavos = parseInt(digits, 10);
  const reais = centavos / 100;
  const formatted = reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return { value: formatted, cursor: formatted.length };
}

interface UseCurrencyInputOptions {
  value: string;
  onChange: (value: string) => void;
}

export function useCurrencyInput({ value, onChange }: UseCurrencyInputOptions) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      const { value: formatted, cursor } = formatCurrencyWithCursor(raw, cursorPos);
      onChange(formatted);

      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(cursor, cursor);
      });
    },
    [onChange]
  );

  return {
    ref: inputRef,
    value,
    onChange: handleChange,
    inputMode: 'numeric' as const,
    placeholder: '0,00',
  };
}
```

**Step 4: Run test — expect PASS**

**Step 5: Replace formatCurrencyInput usage in forms**

In each file, replace:

```tsx
// Before:
onChange={(e) => field.onChange(formatCurrencyInput(e.target.value))}
// After:
// At component level:
const amountInput = useCurrencyInput({ value: form.watch('amount'), onChange: (v) => form.setValue('amount', v) });
// In JSX:
<Input {...amountInput} />
```

Apply to: `add-expense-dialog.tsx` (amount + exchange_rate + custom_amounts), `expense-form.tsx` (amount + exchange_rate), `budget-form-dialog.tsx` (amount).

**Step 6: Run full test suite**

Run: `npm test && npm run lint`
Expected: PASS

**Step 7: Commit**

```bash
git add src/hooks/use-currency-input.ts src/hooks/use-currency-input.test.ts
git add src/components/expenses/ src/components/budget/budget-form-dialog.tsx
git commit -m "feat: fix currency input with live formatting and cursor correction"
```

---

# PHASE 4: Microinteractions and Polish

---

## Task 11: Create contextual FAB and integrate

**Files:**

- Create: `src/components/ui/fab.tsx`
- Modify: Trip tab content pages

**Step 1: Create FAB component**

```tsx
// src/components/ui/fab.tsx
'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/utils/accessibility';

interface FABProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}

export function FAB({ icon: Icon, label, onClick, className }: FABProps) {
  const reduced = typeof window !== 'undefined' && prefersReducedMotion();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'fixed bottom-20 right-4 z-40 md:hidden',
        'flex size-14 items-center justify-center rounded-full',
        'bg-primary text-primary-foreground shadow-lg',
        'active:scale-95 transition-transform',
        !reduced && 'animate-in fade-in zoom-in-75 duration-200',
        className
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}
```

**Step 2: Integrate in trip pages**

Add `<FAB icon={Plus} label="Nova despesa" onClick={() => setAddOpen(true)} />` to:

- Expenses list/content component
- Itinerary content
- Checklists content
- Notes content

Not on: Overview, Balance (no single primary action).

**Step 3: Commit**

```bash
git add src/components/ui/fab.tsx
git add -A
git commit -m "feat: add contextual FAB for quick actions on mobile"
```

---

## Task 12: Add swipe-to-delete on lists

**Files:**

- Modify: Expense list item component
- Modify: `src/components/balance/settlements-list.tsx`

**Step 1: Wrap expense items with SwipeAction**

```tsx
<SwipeAction
  onDelete={() => handleDelete(expense.id)}
  confirmMessage={`Excluir despesa "${expense.description}"?`}
>
  {/* existing expense card */}
</SwipeAction>
```

**Step 2: Wrap settlement items** (action = "mark settled")

```tsx
<SwipeAction
  onDelete={() => handleMarkSettled(settlement)}
  confirmTitle="Marcar como pago"
  confirmMessage={`Confirmar pagamento de ${formatCurrency(settlement.amount)}?`}
>
  {/* existing settlement card */}
</SwipeAction>
```

**Step 3: Run tests and lint, commit**

```bash
git add -A
git commit -m "feat: add swipe-to-delete on expense and settlement lists"
```

---

## Task 13: Compact offline indicator with pending count

**Files:**

- Modify: `src/hooks/use-online-status.ts`
- Modify: `src/components/offline/offline-indicator.tsx`

**Step 1: Add useOnlineStatusExtended hook**

Keep existing `useOnlineStatus()` unchanged (returns `boolean`). Add new `useOnlineStatusExtended()` that returns `{ isOnline: boolean, pendingCount: number }`. The pending count dynamically imports Dexie DB and counts pending sync items.

**Step 2: Redesign offline indicator**

Replace current banner (lines 21-37 of `src/components/offline/offline-indicator.tsx`) with:

- Thin 4px bar: `fixed top-0 left-0 right-0 z-50 h-1 bg-warning animate-pulse`
- Clickable (button): toggles expanded state
- Expanded: shows details card with WifiOff icon + "Modo offline · X operações pendentes"
- Uses `useOnlineStatusExtended()` instead of `useOnlineStatus()`

**Step 3: Run tests and lint, commit**

```bash
git add src/hooks/use-online-status.ts src/components/offline/offline-indicator.tsx
git commit -m "feat: compact offline indicator with pending count"
```

---

## Task 14: Cover images for trips

**Files:**

- Modify: `src/types/database.ts` — add `cover_image_url` to trips
- Create: `src/lib/utils/image.ts` — client resize
- Create: `src/lib/supabase/storage.ts` — upload server action
- Modify: `src/components/trips/edit-trip-dialog.tsx` — upload UI
- Modify: `src/components/trips/trip-card.tsx` — display cover
- Modify: `src/app/(app)/trip/[id]/trip-overview.tsx` — hero header

**Step 1: Update database types**

Add `cover_image_url: string | null` to trips table `Row`, `Insert`, `Update` in `src/types/database.ts`.

**Step 2: Create image resize utility** (`src/lib/utils/image.ts`)

`resizeImage(file: File, maxWidth=1200, quality=0.8): Promise<Blob>` — uses canvas API.

**Step 3: Create storage upload action** (`src/lib/supabase/storage.ts`)

`uploadTripCover(tripId, file): Promise<{ url, error }>` — uploads to `trip-covers` bucket, returns public URL.

**Step 4: Add upload to edit-trip-dialog**

Below description field: file input (accept: image/\*), max 2MB validation, preview thumbnail, calls resize + upload + updates trip record.

**Step 5: Display on trip card**

If `cover_image_url` exists: background image with gradient overlay. Fallback: hashed gradient from trip name.

**Step 6: Display on trip overview**

Hero header section with cover image above stats.

**Step 7: Create Supabase migration**

SQL to add `cover_image_url` column and create `trip-covers` storage bucket with RLS policy.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add cover images to trips with upload, resize, and display"
```

---

## Task 15: Pull-to-refresh

**Files:**

- Create: `src/hooks/use-pull-to-refresh.ts`
- Create: `src/components/ui/pull-to-refresh.tsx`
- Modify: Key list pages

**Step 1: Create usePullToRefresh hook**

Native touch events. Activates only at scrollTop=0. Damped pull distance. Threshold 60px. Cancels on horizontal scroll. Returns `{ pulling, pullDistance, refreshing }`.

**Step 2: Create PullToRefresh wrapper**

Renders pull indicator (spinner or "Atualizando..." for reduced-motion) above children. Takes `onRefresh: () => Promise<void>`.

**Step 3: Apply to list pages**

Wrap trips list, expenses list, etc with `<PullToRefresh onRefresh={() => queryClient.invalidateQueries(...)}>`.

**Step 4: Commit**

```bash
git add src/hooks/use-pull-to-refresh.ts src/components/ui/pull-to-refresh.tsx
git add -A
git commit -m "feat: add pull-to-refresh with custom touch implementation"
```

---

## Task 16: Audit prefers-reduced-motion

**Files:** All animated components from this plan

**Step 1: Verify each animated component**

| Component                       | Reduced Motion Behavior            |
| ------------------------------- | ---------------------------------- |
| MoneyDisplay                    | Instant value update (no count)    |
| SwipeAction                     | No slide animation, instant action |
| FAB                             | No entrance animation              |
| PullToRefresh                   | Static "Atualizando..." text       |
| Wizard/expense step transitions | Instant (no slide)                 |
| Offline indicator               | No pulse on bar                    |

**Step 2: Add global CSS safety net**

In `src/app/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 3: Run full test suite, commit**

```bash
git add -A
git commit -m "a11y: enforce prefers-reduced-motion across all animated components"
```

---

# Verification

## Phase 2 (Componentes)

- AvatarSelector: Tab/Arrow key navigation, screen reader announces selections
- SwipeAction: Chrome DevTools touch simulation → swipe left → AlertDialog
- EmptyState: Clear data on each page, verify illustration + tips
- MoneyDisplay: Add expense → verify count animation. Hover multi-currency → tooltip
- Run: `npm test && npm run lint`

## Phase 3 (Formulários)

- ResponsiveFormContainer: Resize browser < 768px → BottomSheet, > 768px → Dialog
- Quick Mode: Mobile activity form shows 4 fields. "Mais detalhes" expands
- Expense 2-step: Step 1 validates. AvatarSelector works. Back/Forward
- Trip Wizard: Progress bar. Per-step validation. Final submit creates trip
- Currency Input: Type "15000" → "150,00". Edit in middle → cursor stays
- Run: `npm test && npm run lint`

## Phase 4 (Polish)

- FAB: Mobile visible, desktop hidden. Position above bottom nav
- Swipe: Expense list swipe left → confirm → delete
- Offline: DevTools Network Offline → thin bar. Tap to expand
- Cover: Edit trip → upload → verify on card + overview + fallback
- Pull-to-refresh: Pull down → spinner → data refreshes
- Reduced Motion: OS settings → verify all animations disabled
- Run: `npm test && npm run lint`
