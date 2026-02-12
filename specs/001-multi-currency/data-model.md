# Data Model: Suporte a Múltiplas Moedas

**Branch**: `001-multi-currency` | **Date**: 2026-02-12

## Schema Changes

### trips (MODIFY)

| Column          | Type            | Constraint | Default | Notes                        |
| --------------- | --------------- | ---------- | ------- | ---------------------------- |
| `base_currency` | `TEXT NOT NULL` | —          | `'BRL'` | ISO 4217 code. Added column. |

**Validation**: Must be one of: `BRL`, `USD`, `EUR`, `GBP`, `ARS`, `CLP`.
**Lock rule**: Cannot be updated if trip has any expenses (enforced in server action).

### expenses (MODIFY)

| Column          | Type                     | Constraint                  | Default | Notes                                       |
| --------------- | ------------------------ | --------------------------- | ------- | ------------------------------------------- |
| `currency`      | `TEXT NOT NULL`          | —                           | `'BRL'` | Already exists. No change.                  |
| `exchange_rate` | `DECIMAL(10,2) NOT NULL` | `CHECK (exchange_rate > 0)` | `1.00`  | NEW. Rate to convert to trip base_currency. |

**Conversion formula**: `converted_amount = amount * exchange_rate`
**Rule**: When `currency = trip.base_currency`, `exchange_rate` MUST be `1.00`.

### expense_splits (NO CHANGE)

Splits remain in original expense currency. Conversion happens at calculation time using the parent expense's `exchange_rate`.

### trip_budgets (NO CHANGE)

Budget `currency` field already exists. Budget spending aggregation will use converted expense amounts.

### settlements (NO CHANGE)

Settlement amounts are always in trip `base_currency`.

## Migration SQL

```sql
-- Add base_currency to trips (defaults existing trips to BRL)
ALTER TABLE trips ADD COLUMN base_currency TEXT NOT NULL DEFAULT 'BRL';

-- Add exchange_rate to expenses (defaults existing expenses to 1.00)
ALTER TABLE expenses ADD COLUMN exchange_rate DECIMAL(10,2) NOT NULL DEFAULT 1.00
  CHECK (exchange_rate > 0);
```

## Entity Relationships

```
Trip (base_currency)
  ├── Expense (currency, exchange_rate, amount)
  │     └── ExpenseSplit (amount — in original currency)
  ├── TripBudget (currency — should match base_currency)
  └── Settlement (amount — in base_currency)
```

## TypeScript Type Changes

### database.ts — Trip

```typescript
// Add to Row, Insert, Update:
base_currency: string;  // Row
base_currency?: string; // Insert (defaults to 'BRL')
base_currency?: string; // Update
```

### database.ts — Expense

```typescript
// Add to Row, Insert, Update:
exchange_rate: number;  // Row
exchange_rate?: number; // Insert (defaults to 1.00)
exchange_rate?: number; // Update
```

### NEW: src/types/currency.ts

```typescript
export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'ARS', 'CLP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  BRL: 'Real (R$)',
  USD: 'Dólar (US$)',
  EUR: 'Euro (€)',
  GBP: 'Libra (£)',
  ARS: 'Peso Argentino (ARS)',
  CLP: 'Peso Chileno (CLP)',
};
```

### expense.ts — CreateExpenseInput

```typescript
// Add:
exchange_rate?: number; // defaults to 1.00 when currency matches trip base
```

### balance/types.ts — ExpenseData

```typescript
// Add:
exchangeRate: number;
currency: string;
```

### sync/db.ts — CachedExpense

```typescript
// Add:
exchange_rate: number;
// Bump Dexie version: 2 → 3
```

## State Transitions

```
Trip base_currency:
  [Created] → base_currency set → [Locked once expenses exist] → cannot change

Expense exchange_rate:
  [Created] → rate set (manual or 1.00) → [Editable anytime] → balance recalculates
```
