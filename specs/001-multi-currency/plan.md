# Implementation Plan: Suporte a Múltiplas Moedas

**Branch**: `001-multi-currency` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-multi-currency/spec.md`

## Summary

Add multi-currency support to trip expenses. Trips get a `base_currency` field (ISO 4217). Expenses already have a `currency` field; we add `exchange_rate` for conversion. Balance and settlement calculations convert all amounts to trip base currency. Existing trips default to BRL via data migration. Currency selection from fixed list of 6 currencies (BRL, USD, EUR, GBP, ARS, CLP). Exchange rates entered manually by users (2 decimal places). Display shows original amount prominently with converted amount below.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 (App Router), React 19
**Primary Dependencies**: Supabase (PostgreSQL + Auth + RLS), Tailwind CSS v4, shadcn/ui, React Query, Zustand, Dexie.js, react-hook-form, Zod, jsPDF
**Storage**: Supabase PostgreSQL (online) + IndexedDB via Dexie.js (offline)
**Testing**: Vitest (unit), Testing Library (component), Playwright (E2E)
**Target Platform**: Web (PWA, offline-capable)
**Project Type**: Web application (Next.js fullstack)
**Performance Goals**: Balance recalculation <2s after rate edit (SC-003)
**Constraints**: Offline-capable (Constitution II), pt-BR locale, RLS enforced
**Scale/Scope**: Trip-scoped data, ~6 currencies, manual exchange rates

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status | Notes                                                                     |
| ---------------------------- | ------ | ------------------------------------------------------------------------- |
| I. User-Centric First        | PASS   | Clear UX for currency selection and display (original + converted)        |
| II. Offline-First & PWA      | PASS   | Exchange rates stored with expense in Dexie; no online API dependency     |
| III. Test-First              | PASS   | Unit tests for balance calc with multi-currency; E2E for add expense flow |
| IV. Type Safety & Validation | PASS   | Zod schemas for exchange_rate; typed currency literal union               |
| V. Simplicidade (YAGNI)      | PASS   | Fixed 6-currency list; manual rates only; no API integration              |

**Gate Result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-currency/
├── spec.md              # Feature specification (completed + clarifications)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # Server action contracts
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (files to modify/create)

```text
# Database
supabase/migrations/XXXXX_add_multi_currency.sql    # NEW: Add base_currency to trips, exchange_rate to expenses

# Types
src/types/database.ts                                # MODIFY: Add base_currency to Trip, exchange_rate to Expense
src/types/expense.ts                                 # MODIFY: Add exchange_rate to CreateExpenseInput/UpdateExpenseInput
src/types/currency.ts                                # NEW: Currency types, constants, supported currencies list

# Validation
src/lib/validation/trip-schemas.ts                   # MODIFY: Add base_currency to create/update schemas
src/lib/validation/expense-schemas.ts                # MODIFY: Add exchange_rate field, currency select from fixed list

# Server Actions
src/lib/supabase/trips.ts                            # MODIFY: Handle base_currency in create/update (lock if expenses exist)
src/lib/supabase/expenses.ts                         # MODIFY: Store exchange_rate, compute converted_amount
src/lib/supabase/expense-summary.ts                  # MODIFY: Use exchange_rate in balance aggregation

# Balance Logic
src/lib/balance/calculate-balance.ts                 # MODIFY: Multiply amounts by exchange_rate for base currency
src/lib/balance/calculate-settlements.ts             # NO CHANGE: Already works with amounts (now in base currency)
src/lib/balance/types.ts                             # MODIFY: Add currency fields to types if needed

# Utils
src/lib/utils/currency.ts                            # MODIFY: Add formatConvertedAmount, currency symbol helpers

# Components
src/components/trips/create-trip-dialog.tsx           # MODIFY: Add base_currency selector
src/components/expenses/expense-form.tsx              # MODIFY: Add currency + exchange_rate fields (conditional)
src/components/expenses/expense-card.tsx              # MODIFY: Show original + converted amounts
src/components/summary/trip-summary.tsx               # MODIFY: Show currency symbol from trip base_currency
src/components/budget/budget-summary.tsx              # MODIFY: Use trip base_currency

# Offline
src/lib/sync/db.ts                                   # MODIFY: Add exchange_rate to CachedExpense, bump Dexie version

# Export
src/lib/export/pdf-expense-report.ts                 # MODIFY: Include currency info and converted amounts
src/lib/export/csv-expenses.ts                       # MODIFY: Add exchange_rate and converted_amount columns

# Tests
src/lib/balance/__tests__/                           # NEW: Multi-currency balance calculation tests
src/lib/validation/__tests__/                        # NEW: Exchange rate validation tests
```

**Structure Decision**: Existing Next.js App Router structure. No new directories needed beyond `src/types/currency.ts` for currency constants. All changes follow existing patterns.

## Complexity Tracking

> No constitution violations. No complexity justifications needed.
