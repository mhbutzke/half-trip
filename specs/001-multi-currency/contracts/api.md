# API Contracts: Suporte a Múltiplas Moedas

**Branch**: `001-multi-currency` | **Date**: 2026-02-12

## Server Actions (modified)

### createTrip(input)

**File**: `src/lib/supabase/trips.ts`

```typescript
// Input change:
type CreateTripInput = {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string | null;
  style?: TripStyle | null;
  base_currency?: SupportedCurrency; // NEW — defaults to 'BRL'
};
```

### updateTrip(tripId, input)

**File**: `src/lib/supabase/trips.ts`

```typescript
// Input change:
type UpdateTripInput = Partial<Omit<CreateTripInput, 'base_currency'>> & {
  base_currency?: SupportedCurrency; // NEW — only accepted if trip has 0 expenses
};

// NEW validation:
// If input.base_currency is provided AND trip has expenses → throw error
// "Não é possível alterar a moeda base após registrar despesas."
```

### createExpense(input)

**File**: `src/lib/supabase/expenses.ts`

```typescript
// Input change:
type CreateExpenseInput = {
  trip_id: string;
  description: string;
  amount: number;
  currency?: string; // existing — now validated against SUPPORTED_CURRENCIES
  date: string;
  category: ExpenseCategory;
  paid_by: string;
  notes?: string | null;
  exchange_rate?: number; // NEW — required when currency !== trip.base_currency
  splits: {
    user_id: string;
    amount: number;
    percentage?: number | null;
  }[];
};

// NEW validation:
// If currency === trip.base_currency → exchange_rate forced to 1.00
// If currency !== trip.base_currency → exchange_rate required, must be > 0
// currency must be in SUPPORTED_CURRENCIES
```

### updateExpense(expenseId, input)

**File**: `src/lib/supabase/expenses.ts`

```typescript
// Input change:
type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, 'trip_id'>> & {
  exchange_rate?: number; // NEW — same validation as create
};
```

### getTripExpenses(tripId)

**File**: `src/lib/supabase/expenses.ts`

```typescript
// Return change: ExpenseWithDetails now includes exchange_rate field
// No input changes
```

### getTripExpenseSummary(tripId)

**File**: `src/lib/supabase/expense-summary.ts`

```typescript
// Return change:
type TripExpenseSummary = {
  tripId: string;
  totalExpenses: number; // NOW in base_currency (sum of amount * exchange_rate)
  expenseCount: number;
  baseCurrency: string; // NEW
  participants: ParticipantBalance[];
  suggestedSettlements: Settlement[];
  settledSettlements: SettlementWithUsers[];
};
```

## Validation Schemas (Zod)

### tripSchema changes

```typescript
// src/lib/validation/trip-schemas.ts
const createTripSchema = z.object({
  // ...existing fields...
  base_currency: z.enum(SUPPORTED_CURRENCIES).default('BRL'), // NEW
});
```

### expenseFormSchema changes

```typescript
// src/lib/validation/expense-schemas.ts
const expenseFormSchema = z
  .object({
    // ...existing fields...
    currency: z.enum(SUPPORTED_CURRENCIES).default('BRL'), // TIGHTENED from z.string()
    exchange_rate: z.string().optional(), // NEW — string for form input
  })
  .refine((data) => {
    // If currency !== base_currency, exchange_rate is required and > 0
    // (base_currency passed via form context, not in schema)
  });
```

## Balance Calculation Contract

### calculateBalances(expenses, members)

**File**: `src/lib/balance/calculate-balance.ts`

```typescript
// Input change: ExpenseData now requires exchangeRate
type ExpenseData = {
  id: string;
  amount: number;
  paidById: string;
  exchangeRate: number; // NEW
  splits: { userId: string; amount: number }[];
};

// Algorithm change:
// convertedAmount = expense.amount * expense.exchangeRate
// totalPaid[paidById] += convertedAmount
// For splits: splitRatio = split.amount / expense.amount
//             totalOwed[userId] += convertedAmount * splitRatio
```
