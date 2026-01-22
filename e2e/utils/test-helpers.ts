import { Page, expect } from '@playwright/test';

/**
 * Test helper utilities for E2E tests
 */

/**
 * Generate unique test user credentials
 */
export function generateTestUser() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  return {
    name: `Test User ${timestamp}`,
    email: `test-${timestamp}-${random}@halftrip.test`,
    password: 'Test123456!',
  };
}

/**
 * Fill and submit registration form
 */
export async function registerUser(
  page: Page,
  user: { name: string; email: string; password: string }
) {
  await page.goto('/register');

  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);

  await page.click('button[type="submit"]');

  // Wait for success state or redirect
  await page.waitForTimeout(2000);
}

/**
 * Fill and submit login form
 */
export async function loginUser(page: Page, credentials: { email: string; password: string }) {
  await page.goto('/login');

  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);

  await page.click('button[type="submit"]');

  // Wait for redirect to trips page
  await page.waitForURL('/trips', { timeout: 10000 });
}

/**
 * Create a new trip
 */
export async function createTrip(
  page: Page,
  trip: {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    style?: string;
    description?: string;
  }
) {
  // Open create trip dialog
  await page.click('button:has-text("Nova viagem")');

  // Wait for dialog to open
  await page.waitForSelector('[role="dialog"]');

  // Fill form
  await page.fill('input[name="name"]', trip.name);
  await page.fill('input[name="destination"]', trip.destination);
  await page.fill('input[name="start_date"]', trip.startDate);
  await page.fill('input[name="end_date"]', trip.endDate);

  if (trip.style) {
    await page.click(`button:has-text("${trip.style}")`);
  }

  if (trip.description) {
    await page.fill('textarea[name="description"]', trip.description);
  }

  // Submit form
  await page.click('[role="dialog"] button[type="submit"]');

  // Wait for redirect to trip detail page
  await page.waitForURL(/\/trip\/[a-f0-9-]+$/, { timeout: 10000 });
}

/**
 * Add an expense
 */
export async function addExpense(
  page: Page,
  expense: {
    description: string;
    amount: number;
    category: string;
    date: string;
  }
) {
  // Open add expense sheet
  await page.click('button:has-text("Nova despesa")');

  // Wait for sheet to open
  await page.waitForSelector('[role="dialog"]');

  // Fill form
  await page.fill('input[name="description"]', expense.description);
  await page.fill('input[name="amount"]', expense.amount.toString());
  await page.fill('input[name="date"]', expense.date);

  // Select category
  await page.click(`button:has-text("${expense.category}")`);

  // Submit form
  await page.click('[role="dialog"] button[type="submit"]');

  // Wait for sheet to close
  await page.waitForTimeout(1000);
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message?: string) {
  if (message) {
    await expect(page.locator('[data-sonner-toast]')).toContainText(message);
  } else {
    await expect(page.locator('[data-sonner-toast]')).toBeVisible();
  }
}

/**
 * Dismiss all toasts
 */
export async function dismissToasts(page: Page) {
  const toasts = page.locator('[data-sonner-toast] button[aria-label="Close"]');
  const count = await toasts.count();

  for (let i = 0; i < count; i++) {
    await toasts.nth(i).click({ force: true });
  }

  await page.waitForTimeout(500);
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days from now
 */
export function getDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateForInput(date);
}
