# Tasks: Suporte a Múltiplas Moedas

**Input**: Design documents from `/specs/001-multi-currency/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Database migration, types, and constants needed by all stories

- [x] T001 Create Supabase migration adding `base_currency` to trips and `exchange_rate` to expenses in `supabase/migrations/XXXXX_add_multi_currency.sql`
- [x] T002 Create currency constants file with `SUPPORTED_CURRENCIES`, `SupportedCurrency` type, and `CURRENCY_LABELS` in `src/types/currency.ts`
- [x] T003 [P] Update Trip types (Row/Insert/Update) to include `base_currency` field in `src/types/database.ts`
- [x] T004 [P] Update Expense types (Row/Insert/Update) to include `exchange_rate` field in `src/types/database.ts`
- [x] T005 [P] Update `CachedExpense` interface to include `exchange_rate` and bump Dexie version from 2 to 3 in `src/lib/sync/db.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Validation schemas and balance logic that MUST be complete before any UI story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Update `createTripSchema` and `updateTripSchema` to include `base_currency` field with `z.enum(SUPPORTED_CURRENCIES)` in `src/lib/validation/trip-schemas.ts`
- [x] T007 Update `expenseFormSchema` to constrain `currency` to `z.enum(SUPPORTED_CURRENCIES)` and add `exchange_rate` string field in `src/lib/validation/expense-schemas.ts`
- [x] T008 Update `ExpenseData` type to include `exchangeRate` and `currency` fields in `src/lib/balance/types.ts`
- [x] T009 Modify `calculateBalances()` to compute `convertedAmount = amount * exchangeRate` for `totalPaid` and use split ratio for `totalOwed` in `src/lib/balance/calculate-balance.ts`
- [x] T010 Update `CreateExpenseInput` and `UpdateExpenseInput` to include `exchange_rate` field in `src/types/expense.ts`
- [x] T011 Write unit tests for multi-currency balance calculation (expenses in BRL+USD+EUR with different rates) in `src/lib/balance/__tests__/calculate-balance.test.ts`

**Checkpoint**: Foundation ready — balance calculation works with exchange rates, schemas validate currency fields

---

## Phase 3: User Story 1 — Moeda da Viagem (Priority: P1) MVP

**Goal**: Organizador define moeda base da viagem ao criar/editar. Viagens existentes recebem BRL via migração.

**Independent Test**: Criar viagem e selecionar moeda base (ex: EUR). Verificar que moeda aparece nos dados da viagem. Editar viagem sem despesas → pode trocar moeda. Viagem com despesas → bloqueado.

### Implementation for User Story 1

- [x] T012 [US1] Update `createTrip()` server action to accept and store `base_currency` (default 'BRL') in `src/lib/supabase/trips.ts`
- [x] T013 [US1] Update `updateTrip()` server action to accept `base_currency` only if trip has 0 expenses (query expense count, throw error if > 0) in `src/lib/supabase/trips.ts`
- [x] T014 [US1] Add `base_currency` select field (using `SUPPORTED_CURRENCIES` + `CURRENCY_LABELS`) to the create trip form in `src/components/trips/create-trip-dialog.tsx`
- [x] T015 [US1] Add `base_currency` select field to the trip edit/settings form (disabled with tooltip if expenses exist) in the trip settings component

**Checkpoint**: Trips have base_currency. New trips allow selection, existing trips default to BRL, locked after expenses.

---

## Phase 4: User Story 2 — Registrar Despesa em Moeda Diferente (Priority: P1)

**Goal**: Usuário escolhe moeda da despesa e informa taxa de câmbio manual. Sistema converte para moeda base.

**Independent Test**: Adicionar despesa em USD com taxa 5.78 numa viagem BRL. Verificar que `exchange_rate` é armazenado. Adicionar despesa em BRL → taxa auto 1.00. Campo de taxa oculto quando moeda = base.

### Implementation for User Story 2

- [x] T016 [US2] Update `createExpense()` server action to validate currency against `SUPPORTED_CURRENCIES`, require `exchange_rate > 0` when currency differs from trip `base_currency`, force `1.00` when same in `src/lib/supabase/expenses.ts`
- [x] T017 [US2] Update `updateExpense()` server action with same exchange_rate validation logic in `src/lib/supabase/expenses.ts`
- [x] T018 [US2] Add currency selector dropdown and conditional `exchange_rate` input field to expense form (hide rate when currency matches trip base_currency, show when different) in the expense add/edit form component
- [x] T019 [US2] Update `parseAmount` and `formatAmountInput` helpers to handle exchange_rate string input (2 decimal places) in `src/lib/validation/expense-schemas.ts`

**Checkpoint**: Expenses can be created/edited with foreign currency + exchange rate. Rate forced to 1.00 for base currency.

---

## Phase 5: User Story 3 — Visualização e Balanço Unificado (Priority: P1)

**Goal**: Despesas mostram valor original em destaque + convertido abaixo. Balanço e acertos em moeda base.

**Independent Test**: Criar viagem EUR, adicionar despesas em USD e BRL com taxas. Verificar lista de despesas mostra dual amounts. Balanço mostra totais em EUR. Acertos em EUR.

### Implementation for User Story 3

- [x] T020 [US3] Update `getTripExpenseSummary()` to pass `exchangeRate` from each expense to balance calculation and add `baseCurrency` to response in `src/lib/supabase/expense-summary.ts`
- [x] T021 [US3] Update expense card to show original amount prominently and converted amount in smaller text below (only when currency differs from trip base_currency) in `src/components/expenses/expense-card.tsx`
- [x] T022 [US3] Update `formatCurrency()` or add `formatConvertedAmount()` helper to format amounts with correct currency symbol in `src/lib/utils/currency.ts`
- [x] T023 [US3] Update trip summary component to display `baseCurrency` symbol in totals, balances, and settlement amounts in `src/components/summary/trip-summary.tsx`
- [x] T024 [US3] Update expenses list `filteredTotal` calculation to sum converted amounts (`amount * exchange_rate`) in `src/app/(app)/trip/[id]/expenses/expenses-list.tsx`
- [x] T025 [P] [US3] Update budget summary and category card components to use trip `base_currency` for display in `src/components/budget/budget-summary.tsx` and `src/components/budget/budget-category-card.tsx`
- [x] T026 [P] [US3] Update budget spending aggregation to sum `amount * exchange_rate` for expenses in `src/lib/supabase/budgets.ts`

**Checkpoint**: All monetary displays use correct currencies. Balance is unified in base currency. Dual amounts visible on expense cards.

---

## Phase 6: User Story 4 — Editar Taxa de Câmbio (Priority: P2)

**Goal**: Usuário edita taxa de câmbio de despesa existente. Balanço recalcula automaticamente.

**Independent Test**: Editar taxa de despesa USD de 5.00 → 5.10. Verificar que balanço atualiza. Taxa não editável para despesas em moeda base.

### Implementation for User Story 4

- [x] T027 [US4] Ensure expense edit form pre-populates existing `exchange_rate` value and allows modification (rate field disabled/hidden for base currency expenses) in the expense edit form component
- [x] T028 [US4] Verify that revalidation paths in `updateExpense()` already trigger balance page refresh after rate edit in `src/lib/supabase/expenses.ts`

**Checkpoint**: Exchange rate editable on existing expenses. Balance recalculates on save. Base currency expenses don't show rate field.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Export updates, offline sync, and final validation

- [x] T029 [P] Update PDF export to include currency and converted amount columns, and show trip `base_currency` in header in `src/lib/export/pdf-expense-report.ts`
- [x] T030 [P] Update CSV export to add `exchange_rate` and `converted_amount` columns in `src/lib/export/csv-expenses.ts`
- [x] T031 Verify offline flow: create expense with exchange_rate offline, sync when online, confirm rate persists in Dexie.js cache
- [x] T032 Run `pnpm build` and fix any TypeScript errors from new fields
- [x] T033 Run full test suite (`pnpm test`) and fix failures
- [x] T034 Run quickstart.md manual verification checklist end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — trip base_currency management
- **US2 (Phase 4)**: Depends on Phase 2 + Phase 3 (needs trip.base_currency to validate expense currency)
- **US3 (Phase 5)**: Depends on Phase 2 + Phase 4 (needs expenses with exchange_rate to display)
- **US4 (Phase 6)**: Depends on Phase 4 (reuses expense edit form)
- **Polish (Phase 7)**: Depends on all user stories

### User Story Dependencies

- **US1 → US2**: US2 needs trip's `base_currency` to determine when `exchange_rate` is required
- **US2 → US3**: US3 needs expenses with `exchange_rate` data to display converted amounts
- **US2 → US4**: US4 edits `exchange_rate` which US2 creates
- **US3 and US4**: Can run in parallel (US3 is display, US4 is edit — different concern areas)

### Within Each User Story

- Server actions before UI components
- Validation before form components
- Core logic before display components

### Parallel Opportunities

- **Phase 1**: T003, T004, T005 can run in parallel (different files)
- **Phase 5**: T025, T026 can run in parallel (budget components independent from expense display)
- **Phase 7**: T029, T030 can run in parallel (PDF and CSV are independent files)

---

## Parallel Example: Phase 1 Setup

```bash
# Sequential first:
Task T001: "Create migration SQL"
Task T002: "Create currency constants"

# Then parallel:
Task T003: "Update Trip types in database.ts"    # [P]
Task T004: "Update Expense types in database.ts"  # [P] (same file but different sections)
Task T005: "Update Dexie schema in db.ts"         # [P]
```

## Parallel Example: Phase 5 Display

```bash
# Sequential core:
Task T020: "Update expense summary with exchange rates"
Task T021: "Update expense card with dual amounts"
Task T022: "Add currency format helpers"
Task T023: "Update trip summary currency display"
Task T024: "Update expenses list total calculation"

# Parallel budget updates:
Task T025: "Update budget summary components"     # [P]
Task T026: "Update budget spending aggregation"    # [P]
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 3)

1. Complete Phase 1: Setup (migration + types)
2. Complete Phase 2: Foundational (schemas + balance logic + tests)
3. Complete Phase 3: US1 — Trip base currency
4. Complete Phase 4: US2 — Expense currency + exchange rate
5. Complete Phase 5: US3 — Display and balance in base currency
6. **STOP and VALIDATE**: Full multi-currency flow works end-to-end
7. Deploy/demo

### Then P2 Features

8. Complete Phase 6: US4 — Edit exchange rate
9. Complete Phase 7: Polish (exports, offline, final tests)

### Incremental Delivery

Each phase delivers a testable increment:

- After Phase 3: Trips have base_currency (no visible UX change for expenses yet)
- After Phase 4: Users can add expenses in foreign currencies
- After Phase 5: Full multi-currency visibility in UI
- After Phase 6: Rate correction capability
- After Phase 7: Exports include currency data

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Constitution requires tests (Principle III) — included in Phase 2
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All UI text in Portuguese (pt-BR)
