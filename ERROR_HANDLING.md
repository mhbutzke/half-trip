# Error Handling Guide

This document describes the error handling system implemented in Half Trip.

## Overview

The error handling system provides:

- User-friendly error messages in Portuguese
- Comprehensive error boundaries to prevent app crashes
- API error handling with automatic retry logic
- Error logging system (console-based, ready for external services)
- Standardized error UI components

## Error Handling Components

### 1. Error Boundaries

**ErrorBoundary** - Catches JavaScript errors in child components and displays a fallback UI.

```tsx
import { ErrorBoundary } from '@/components/errors';

function MyComponent() {
  return (
    <ErrorBoundary>
      <ComponentThatMightError />
    </ErrorBoundary>
  );
}

// With custom fallback
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h1>Oops!</h1>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
>
  <ComponentThatMightError />
</ErrorBoundary>;
```

### 2. API Error Handling

**handleApiError** - Converts technical errors to user-friendly messages.

```tsx
import { handleApiError, formatErrorForToast } from '@/lib/errors';
import { toast } from 'sonner';

async function createTrip(data: TripData) {
  try {
    const result = await createTripAction(data);
    toast.success('Viagem criada!');
  } catch (error) {
    const apiError = handleApiError(error);
    toast.error(apiError.message);
    // or use the helper:
    // toast.error(formatErrorForToast(error))
  }
}
```

**safeAction** - Wraps server actions with automatic error handling.

```tsx
'use server';

import { safeAction } from '@/lib/errors';

export async function createTrip(data: TripData) {
  return safeAction(async () => {
    // Your logic here
    const trip = await db.trips.create(data);
    return trip;
  });
}

// Usage in component:
const result = await createTrip(data);
if (!result.success) {
  toast.error(result.error.message);
} else {
  toast.success('Viagem criada!');
  const trip = result.data;
}
```

### 3. Error Logging

**logError**, **logWarning**, **logInfo**, **logDebug** - Structured logging functions.

```tsx
import { logError, logWarning, logInfo, logActionFailure } from '@/lib/errors';

// Log an error with context
logError(error, {
  userId: user.id,
  tripId: trip.id,
  action: 'create_expense',
});

// Log action failure
try {
  await createExpense(data);
} catch (error) {
  logActionFailure('create_expense', error, { tripId: trip.id });
  throw error;
}

// Log a warning
logWarning('Expense split validation failed', {
  expenseId: expense.id,
  reason: 'Total does not match',
});

// Log info (development only)
logInfo('User joined trip', { userId: user.id, tripId: trip.id });
```

### 4. Error UI Components

**ErrorMessage** - Inline error display component.

```tsx
import { ErrorMessage } from '@/components/errors';

function MyForm() {
  const [error, setError] = useState<string | null>(null);

  return (
    <form>
      {error && <ErrorMessage message={error} />}
      {/* form fields */}
    </form>
  );
}
```

## Error Messages

All error messages are defined in `src/lib/errors/error-messages.ts` and are in Portuguese.

Common error codes:

- `NETWORK_ERROR` - Network connection issues
- `INVALID_CREDENTIALS` - Invalid login credentials
- `UNAUTHORIZED` - Insufficient permissions
- `VALIDATION_ERROR` - Form validation errors
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Duplicate record
- `FILE_TOO_LARGE` - File size exceeded
- `UNKNOWN_ERROR` - Generic error

## App-Level Error Pages

### error.tsx

Root error page that catches unhandled errors in the app. Shows:

- User-friendly error message
- "Try Again" button to attempt recovery
- "Back to Home" link
- Error details (development only)

### not-found.tsx

404 error page for missing routes. Shows:

- Friendly "Page not found" message
- "Back to Home" button

## Best Practices

### 1. Always Handle Errors in Client Components

```tsx
'use client';

import { handleApiError } from '@/lib/errors';
import { toast } from 'sonner';

export function MyComponent() {
  async function handleSubmit() {
    try {
      await createTrip(data);
      toast.success('Viagem criada!');
    } catch (error) {
      toast.error(formatErrorForToast(error));
    }
  }
}
```

### 2. Use safeAction for Server Actions

```tsx
'use server';

import { safeAction } from '@/lib/errors';

export async function deleteTrip(tripId: string) {
  return safeAction(async () => {
    // Check permissions, delete trip, etc.
    await db.trips.delete(tripId);
  });
}
```

### 3. Log Errors with Context

```tsx
import { logError } from '@/lib/errors';

try {
  await updateExpense(data);
} catch (error) {
  logError(error, {
    userId: user.id,
    expenseId: expense.id,
    action: 'update_expense',
  });
  throw error; // Re-throw after logging
}
```

### 4. Use Error Boundaries for Critical Sections

```tsx
import { ErrorBoundary } from '@/components/errors';

export default function TripPage() {
  return (
    <ErrorBoundary>
      <TripContent />
    </ErrorBoundary>
  );
}
```

### 5. Show User-Friendly Messages

Never show raw error messages to users. Always use the error handling utilities:

```tsx
// ❌ Bad
toast.error(error.message);

// ✅ Good
toast.error(formatErrorForToast(error));
```

## Testing Error Handling

### 1. Test Error Boundaries

Temporarily add code that throws an error:

```tsx
function ComponentThatErrors() {
  throw new Error('Test error');
}
```

Verify that:

- App doesn't crash
- Error boundary shows fallback UI
- Error is logged to console
- "Try Again" button works

### 2. Test API Errors

Use network throttling or disable Supabase to test:

- Network error handling
- Offline error messages
- Retry logic

### 3. Test Form Validation

Submit forms with invalid data to test:

- Field-level validation errors
- Form-level error messages
- Error message clarity

## Future Enhancements

The error handling system is ready to integrate with external services:

1. **Sentry** - For error tracking and monitoring
2. **LogRocket** - For session replay and debugging
3. **PostHog** - For user behavior analytics

To integrate, simply update the `logError` function in `src/lib/errors/logger.ts`:

```tsx
import * as Sentry from '@sentry/nextjs';

export function logError(error: unknown, context?: LogContext): void {
  // Console logging
  console.error('[Error]', error, context);

  // Send to Sentry
  Sentry.captureException(error, {
    contexts: { custom: context },
  });
}
```

## Error Handling Checklist

When adding new features, ensure:

- [ ] Server actions use `safeAction` wrapper
- [ ] Client components handle errors with try/catch
- [ ] Errors show user-friendly messages (Portuguese)
- [ ] Critical sections wrapped in ErrorBoundary
- [ ] Errors logged with relevant context
- [ ] Loading and error states implemented
- [ ] Form validation errors displayed inline
- [ ] Network errors handled gracefully
- [ ] Permission errors handled appropriately
- [ ] 404 errors handled with proper fallback

## Summary

The error handling system provides:

1. ✅ Error boundaries to prevent crashes
2. ✅ User-friendly error messages in Portuguese
3. ✅ API error handling with retry logic
4. ✅ Structured error logging
5. ✅ App-level error pages (error.tsx, not-found.tsx)
6. ✅ Reusable error UI components
7. ✅ Ready for external error tracking integration

All errors are handled gracefully, providing a smooth user experience even when things go wrong.
