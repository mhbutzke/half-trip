# Research: Suporte a Múltiplas Moedas

**Branch**: `001-multi-currency` | **Date**: 2026-02-12

## 1. Exchange Rate Storage Strategy

**Decision**: Store `exchange_rate` as `DECIMAL(10,2)` on the `expenses` table.

**Rationale**: 2 decimal places was chosen in clarification for simplicity. The rate represents "1 unit of expense currency = X units of base currency" (e.g., 1 USD = 5.78 BRL). Storing the rate with the expense makes it immutable — historical accuracy is preserved regardless of future rate changes.

**Alternatives considered**:

- Separate exchange_rates table with date lookup → over-engineered for manual entry
- 4+ decimal precision → rejected in clarification; 2 decimals is sufficient for travel use

## 2. Balance Calculation with Multi-Currency

**Decision**: Modify `calculateBalances()` to use `amount * exchange_rate` for each expense when computing `totalPaid` and split amounts.

**Rationale**: The existing algorithm in `src/lib/balance/calculate-balance.ts` iterates over expenses summing `amount` for `totalPaid` and split `amount` for `totalOwed`. The change is minimal: multiply by `exchange_rate` (defaulting to 1 for same-currency expenses). The settlement algorithm (`calculate-settlements.ts`) requires NO changes since it operates on the already-computed `netBalance` values.

**Existing code pattern**:

```
For each expense:
  totalPaid[paidById] += expense.amount
  For each split:
    totalOwed[split.userId] += split.amount
```

**New pattern**:

```
For each expense:
  convertedAmount = expense.amount * expense.exchangeRate
  totalPaid[paidById] += convertedAmount
  For each split:
    splitRatio = split.amount / expense.amount
    totalOwed[split.userId] += convertedAmount * splitRatio
```

**Key insight**: Splits are stored as absolute amounts in the original currency. To convert, we compute each split's ratio of the total, then apply to the converted amount. This avoids rounding errors from converting each split independently.

## 3. Base Currency Lock Mechanism

**Decision**: Prevent changing `base_currency` on trips that have expenses.

**Rationale**: Recalculating all exchange rates when base currency changes is complex and error-prone (requires cross-rates). Simpler to lock once expenses exist. Implementation: `updateTrip()` server action checks expense count before allowing `base_currency` changes.

## 4. Migration Strategy for Existing Data

**Decision**: SQL migration adds `base_currency TEXT NOT NULL DEFAULT 'BRL'` to trips and `exchange_rate DECIMAL(10,2) NOT NULL DEFAULT 1.00` to expenses.

**Rationale**: All existing trips and expenses are in BRL (the app's default). Setting defaults means zero data loss, zero manual intervention. Existing expenses with `currency = 'BRL'` correctly have `exchange_rate = 1.00`.

## 5. Expense Split Handling

**Decision**: Splits continue to be stored in the original expense currency. Conversion to base currency happens at calculation time only.

**Rationale**: Keeping splits in original currency maintains the source-of-truth relationship (split amounts must sum to expense amount). Converting at calculation time using the expense's exchange_rate ensures consistency. No schema change needed for `expense_splits`.

## 6. Currency Display Pattern

**Decision**: Use `Intl.NumberFormat` with the expense's currency code for original amount, and trip's `base_currency` for converted amount.

**Rationale**: The existing `formatCurrency(amount, currency)` in `src/lib/utils/currency.ts` already accepts a currency parameter and uses `Intl.NumberFormat('pt-BR', { style: 'currency', currency })`. This handles symbol placement and formatting for all 6 supported currencies automatically.

## 7. Offline Considerations

**Decision**: Exchange rate is stored with the expense in Dexie.js (`CachedExpense`). No separate rate cache needed.

**Rationale**: Since rates are manually entered (not fetched from API), the rate is always available as part of the expense record. Offline balance calculations work identically to online — just read `exchange_rate` from each cached expense.

## 8. Budget Integration

**Decision**: Trip budgets remain in `base_currency` only. Budget comparison uses converted expense totals.

**Rationale**: `trip_budgets` already has a `currency` field. With multi-currency expenses, budget spending aggregation must sum `amount * exchange_rate` instead of just `amount`. The budget's own currency should match the trip's `base_currency`.
