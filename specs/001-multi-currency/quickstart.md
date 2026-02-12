# Quickstart: Suporte a Múltiplas Moedas

**Branch**: `001-multi-currency` | **Date**: 2026-02-12

## Prerequisites

- Node.js 18+, pnpm
- Supabase CLI + linked project
- Local dev server running (`pnpm dev`)

## Implementation Order

### Layer 1: Database + Types (no UI changes)

1. **Migration**: Create `supabase/migrations/XXXXX_add_multi_currency.sql`
   - `ALTER TABLE trips ADD COLUMN base_currency TEXT NOT NULL DEFAULT 'BRL'`
   - `ALTER TABLE expenses ADD COLUMN exchange_rate DECIMAL(10,2) NOT NULL DEFAULT 1.00 CHECK (exchange_rate > 0)`
   - Apply: `supabase db push` (remote) or `supabase migration up` (local)

2. **Types**: Update `src/types/database.ts` (Trip + Expense Row/Insert/Update)

3. **Currency constants**: Create `src/types/currency.ts` with `SUPPORTED_CURRENCIES` and labels

4. **Offline schema**: Update `src/lib/sync/db.ts` — add `exchange_rate` to `CachedExpense`, bump Dexie version to 3

5. **Validation schemas**: Update `trip-schemas.ts` and `expense-schemas.ts`

### Layer 2: Server Actions + Balance Logic (backend)

6. **Trip actions**: Update `createTrip` and `updateTrip` in `src/lib/supabase/trips.ts`
   - Pass `base_currency` on create
   - Block `base_currency` change if expenses exist

7. **Expense actions**: Update `createExpense` and `updateExpense` in `src/lib/supabase/expenses.ts`
   - Validate currency against `SUPPORTED_CURRENCIES`
   - Store `exchange_rate` (force 1.00 when same as base)

8. **Balance calculation**: Update `src/lib/balance/calculate-balance.ts`
   - Apply `exchangeRate` in `totalPaid` and `totalOwed` computation

9. **Expense summary**: Update `src/lib/supabase/expense-summary.ts`
   - Pass `exchangeRate` to balance calculation
   - Add `baseCurrency` to summary response

### Layer 3: UI Components (frontend)

10. **Trip form**: Add `base_currency` selector to `create-trip-dialog.tsx`

11. **Expense form**: Add currency selector + conditional exchange_rate field

12. **Expense card**: Show dual amounts (original + converted) in `expense-card.tsx`

13. **Balance/Summary**: Update `trip-summary.tsx` to use `baseCurrency`

14. **Budget**: Update budget components to use trip `base_currency`

### Layer 4: Export + Tests

15. **PDF export**: Update `pdf-expense-report.ts` to include currency columns

16. **CSV export**: Add `exchange_rate` and `converted_amount` columns

17. **Unit tests**: Balance calculation with multi-currency expenses

18. **E2E tests**: Add expense in foreign currency, verify balance

## Verification

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Build check
pnpm build

# Manual verification:
# 1. Create trip with base_currency EUR
# 2. Add expense in USD with exchange_rate 0.92
# 3. Add expense in EUR (rate auto-set to 1.00)
# 4. Check balance page — all values in EUR
# 5. Edit exchange rate on USD expense → verify balance recalculates
# 6. Try changing base_currency → should be blocked
# 7. Export PDF/CSV → verify currency columns
```
