# E2E Testing Guide

This document provides a comprehensive guide to the End-to-End (E2E) testing setup for Half Trip using Playwright.

## Overview

E2E tests simulate real user interactions with the application, ensuring that critical user journeys work correctly from start to finish. Our test suite covers:

- Authentication flows (registration, login, password recovery)
- Trip management (create, view, edit, archive)
- Expense tracking (add, edit, delete, filter)
- Invite system (generate links, send emails, join trips)
- Balance calculations and settlements
- Multi-user collaboration features

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Application running locally or access to test environment

## Installation

Playwright and browser dependencies are already installed in the project. If you need to reinstall:

```bash
# Install Playwright
pnpm add -D @playwright/test

# Install browsers
pnpm playwright install chromium
```

## Test Structure

```
e2e/
├── setup.ts              # Test configuration and fixtures
├── utils/
│   └── test-helpers.ts   # Helper functions for common operations
├── auth.spec.ts          # Authentication flow tests
├── trips.spec.ts         # Trip management tests
├── expenses.spec.ts      # Expense management tests
├── invites.spec.ts       # Invite and join flow tests
└── balance.spec.ts       # Balance view and settlements tests
```

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests in UI mode (interactive)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Debug specific test
pnpm test:e2e:debug

# View test report
pnpm test:e2e:report
```

### Running Specific Tests

```bash
# Run a single test file
pnpm playwright test e2e/auth.spec.ts

# Run tests matching a pattern
pnpm playwright test --grep "should register"

# Run specific project (desktop vs mobile)
pnpm playwright test --project=chromium
pnpm playwright test --project="Mobile Chrome"
```

## Test Configuration

Configuration is defined in `playwright.config.ts`:

```typescript
{
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
}
```

### Environment Variables

- `PLAYWRIGHT_TEST_BASE_URL`: Override base URL (default: `http://localhost:3000`)
- `CI`: Enable CI-specific settings (retries, single worker)

## Helper Functions

The `e2e/utils/test-helpers.ts` file provides reusable functions:

### User Management

```typescript
// Generate unique test user
const user = generateTestUser();

// Register a new user
await registerUser(page, user);

// Login existing user
await loginUser(page, { email: user.email, password: user.password });
```

### Trip Operations

```typescript
// Create a new trip
await createTrip(page, {
  name: 'Beach Trip',
  destination: 'Rio de Janeiro',
  startDate: getDaysFromNow(7),
  endDate: getDaysFromNow(14),
  style: 'Praia',
});
```

### Expense Operations

```typescript
// Add an expense
await addExpense(page, {
  description: 'Dinner',
  amount: 150,
  category: 'Alimentação',
  date: getDaysFromNow(0),
});
```

### Utility Functions

```typescript
// Wait for toast notification
await waitForToast(page, 'Viagem criada com sucesso');

// Dismiss all toasts
await dismissToasts(page);

// Get date N days from now (YYYY-MM-DD format)
const date = getDaysFromNow(7);
```

## Test Suite Overview

### 1. Authentication Tests (`auth.spec.ts`)

Tests user authentication flows:

- ✅ User registration with validation
- ✅ Login and logout
- ✅ Password recovery
- ✅ Form validation errors
- ✅ Navigation between auth pages

**Key scenarios:**

- New user signs up and receives confirmation email
- Existing user logs in successfully
- User recovers forgotten password
- Invalid inputs show appropriate errors

### 2. Trip Management Tests (`trips.spec.ts`)

Tests trip creation and management:

- ✅ Create new trip with all fields
- ✅ View trip list (active/archived)
- ✅ Trip detail page with overview cards
- ✅ Edit and archive trips
- ✅ Navigate between trip pages

**Key scenarios:**

- User creates first trip and sees it in the list
- User edits trip details
- User archives old trips
- Navigation works correctly

### 3. Expense Tests (`expenses.spec.ts`)

Tests expense tracking functionality:

- ✅ Add expense with different split types
- ✅ Edit and delete expenses
- ✅ Filter by category and search
- ✅ Receipt upload
- ✅ Expense list display

**Key scenarios:**

- User adds expense with equal split
- User adds expense with custom amounts
- User uploads receipt photo
- User filters expenses by category

### 4. Invite Tests (`invites.spec.ts`)

Tests collaboration features:

- ✅ Generate invite links
- ✅ Copy invite link to clipboard
- ✅ Send email invitations
- ✅ Join trip via invite link
- ✅ Manage participants

**Key scenarios:**

- Organizer generates shareable invite link
- New user receives invite and joins trip
- Organizer manages participant list
- User leaves trip

### 5. Balance Tests (`balance.spec.ts`)

Tests financial calculations:

- ✅ Display total expenses and summary
- ✅ Show individual participant balances
- ✅ Calculate settlement suggestions
- ✅ Mark settlements as paid
- ✅ Display category breakdown

**Key scenarios:**

- User views balance summary
- User sees who owes whom
- User marks settlement as paid
- Balance updates after payment

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from './setup';

test.describe('Feature Name', () => {
  test('should perform action successfully', async ({ page }) => {
    // Navigate to page
    await page.goto('/path');

    // Perform actions
    await page.click('button:has-text("Click me")');

    // Assert expected outcome
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use descriptive test names**

   ```typescript
   ✅ test('should create trip with valid data')
   ❌ test('trip creation')
   ```

2. **Wait for elements properly**

   ```typescript
   ✅ await expect(page.locator('text=Success')).toBeVisible();
   ❌ await page.waitForTimeout(2000);
   ```

3. **Use data-testid for stable selectors**

   ```typescript
   ✅ await page.click('[data-testid="submit-button"]');
   ❌ await page.click('div > div > button:nth-child(3)');
   ```

4. **Clean up test data**

   ```typescript
   test.afterEach(async () => {
     // Delete test trip, user, etc.
   });
   ```

5. **Handle conditional scenarios gracefully**

   ```typescript
   const hasTrips = (await page.locator('[data-testid="trip-card"]').count()) > 0;

   if (hasTrips) {
     // Test trip-specific functionality
   } else {
     // Test empty state
   }
   ```

## Debugging Tests

### 1. Use Playwright Inspector

```bash
pnpm test:e2e:debug
```

This opens an interactive debugger where you can:

- Step through test execution
- Inspect page state
- Try selectors in real-time

### 2. View Traces

Failed tests automatically capture traces. View them with:

```bash
pnpm test:e2e:report
```

Traces include:

- Screenshots at each step
- Network requests
- Console logs
- DOM snapshots

### 3. Add Debug Logging

```typescript
test('debug test', async ({ page }) => {
  await page.goto('/trips');

  // Log current URL
  console.log('Current URL:', page.url());

  // Take screenshot
  await page.screenshot({ path: 'debug.png' });

  // Pause execution (only in debug mode)
  await page.pause();
});
```

### 4. Run Headed Mode

See the browser in action:

```bash
pnpm test:e2e:headed
```

## CI/CD Integration

The tests are configured for CI environments:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: pnpm install

- name: Install Playwright browsers
  run: pnpm playwright install --with-deps chromium

- name: Run E2E tests
  run: pnpm test:e2e
  env:
    CI: true
    PLAYWRIGHT_TEST_BASE_URL: ${{ secrets.TEST_URL }}

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Known Limitations

1. **Email Confirmation**: Tests don't verify actual email delivery. Registration tests check for success messages but don't confirm email accounts.

2. **Real-time Features**: Presence indicators and live sync are difficult to test in E2E. Consider using WebSocket mocks or integration tests.

3. **File Uploads**: Receipt and attachment uploads work but may be flaky on CI. Use stable test images.

4. **Authentication State**: Tests don't maintain authentication between test files. Each file should handle its own auth setup.

5. **Database State**: Tests assume a clean database or handle existing data gracefully with conditional checks.

## Troubleshooting

### Tests Fail with "Timeout"

**Cause**: Element not found or page not loading

**Solution**:

- Check if dev server is running
- Increase timeout: `await expect(locator).toBeVisible({ timeout: 10000 })`
- Verify selector is correct

### Tests Pass Locally but Fail in CI

**Cause**: Timing issues or environment differences

**Solution**:

- Add proper waits instead of fixed timeouts
- Check for CI-specific conditions (slower performance)
- Review screenshots/traces from CI run

### "Navigation timeout" Errors

**Cause**: Page navigation is slow or failing

**Solution**:

- Check network requests in trace
- Increase navigation timeout in config
- Verify target URL is accessible

### Random Failures (Flaky Tests)

**Cause**: Race conditions or unstable selectors

**Solution**:

- Use `waitForLoadState('networkidle')`
- Add explicit waits for dynamic content
- Use more stable selectors (data-testid)

## Performance Considerations

- **Parallel Execution**: Tests run in parallel by default. Use `test.describe.serial()` for dependent tests.
- **Reuse Context**: Consider reusing browser context for faster test startup.
- **Mobile vs Desktop**: Mobile tests are slower due to viewport emulation.

## Maintenance

### Regular Tasks

1. **Update test data**: Keep test users and trips current
2. **Review flaky tests**: Fix or mark as known issues
3. **Update selectors**: When UI changes, update test selectors
4. **Add coverage**: Add tests for new features

### Code Review Checklist

- [ ] Tests cover happy path and edge cases
- [ ] Assertions are specific and meaningful
- [ ] No hardcoded waits (use proper waits)
- [ ] Test names are descriptive
- [ ] Helper functions used where appropriate
- [ ] Tests clean up after themselves

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI Setup](https://playwright.dev/docs/ci)

## Support

For issues or questions:

1. Check this documentation
2. Review Playwright docs
3. Check traces and screenshots
4. Ask team for help

---

**Last Updated**: 2025-01-21
**Version**: 1.0.0
