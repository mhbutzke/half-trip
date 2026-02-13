import { Page, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';

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
    email: `halftrip.test+${timestamp}${random}@gmail.com`,
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

async function isOnLoginScreen(page: Page): Promise<boolean> {
  if (page.url().includes('/login')) return true;
  return (await page.locator('[data-slot="card-title"]', { hasText: 'Entrar' }).count()) > 0;
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

export function getE2EAuthCredentials(): {
  email: string;
  password: string;
} | null {
  const email = process.env.PLAYWRIGHT_E2E_EMAIL?.trim();
  const password = process.env.PLAYWRIGHT_E2E_PASSWORD?.trim();

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

const PIX_FIXTURE_DESCRIPTION = '[E2E_PIX_FIXTURE]';
const PIX_FIXTURE_PEER_EMAIL = 'halftrip.e2e.pix.fixture.bot@gmail.com';
const PIX_FIXTURE_PEER_NAME = 'E2E Pix Fixture Bot';
const RECAP_FIXTURE_DESCRIPTION = '[E2E_RECAP_FIXTURE]';

let envLoaded = false;

function ensureEnvLoaded() {
  if (envLoaded) return;

  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const envRaw = readFileSync(envPath, 'utf8');
    for (const line of envRaw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex <= 0) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      if (process.env[key]) continue;

      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }

  envLoaded = true;
}

function createAdminClient() {
  ensureEnvLoaded();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureFixtureUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  name: string
) {
  if (!admin) return null;

  const { data: existingUser } = await admin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existingUser?.id) {
    return existingUser.id;
  }

  const { data: createdAuthUser, error: createAuthError } = await admin.auth.admin.createUser({
    email,
    password: `E2EFix!${Date.now()}Ab`,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createAuthError || !createdAuthUser.user) {
    return null;
  }

  await admin.from('users').upsert(
    {
      id: createdAuthUser.user.id,
      email,
      name,
    },
    { onConflict: 'id' }
  );

  return createdAuthUser.user.id;
}

/**
 * Creates deterministic fixture data to guarantee at least one pending settlement
 * and therefore an available Pix button in the balance page.
 */
export async function ensureTripWithPendingSettlementFixture(
  ownerEmail: string
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) {
    return null;
  }

  try {
    const { data: owner } = await admin
      .from('users')
      .select('id')
      .eq('email', ownerEmail)
      .maybeSingle();
    if (!owner?.id) {
      return null;
    }

    const peerUserId = await ensureFixtureUser(
      admin,
      PIX_FIXTURE_PEER_EMAIL,
      PIX_FIXTURE_PEER_NAME
    );
    if (!peerUserId) {
      return null;
    }

    const startDate = getDaysFromNow(4);
    const endDate = getDaysFromNow(8);

    const { data: existingTrips } = await admin
      .from('trips')
      .select('id')
      .eq('created_by', owner.id)
      .eq('description', PIX_FIXTURE_DESCRIPTION)
      .order('created_at', { ascending: false })
      .limit(1);

    let tripId = existingTrips?.[0]?.id ?? null;

    if (!tripId) {
      const { data: createdTrip, error: createTripError } = await admin
        .from('trips')
        .insert({
          name: `E2E Pix Fixture ${Date.now()}`,
          destination: 'Sao Paulo',
          start_date: startDate,
          end_date: endDate,
          description: PIX_FIXTURE_DESCRIPTION,
          style: 'cultural',
          created_by: owner.id,
        })
        .select('id')
        .single();

      if (createTripError || !createdTrip?.id) {
        return null;
      }

      tripId = createdTrip.id;
    } else {
      await admin
        .from('trips')
        .update({
          start_date: startDate,
          end_date: endDate,
          archived_at: null,
          style: 'cultural',
        })
        .eq('id', tripId);
    }

    await admin.from('trip_members').upsert(
      [
        { trip_id: tripId, user_id: owner.id, role: 'organizer' },
        { trip_id: tripId, user_id: peerUserId, role: 'participant', invited_by: owner.id },
      ],
      { onConflict: 'trip_id,user_id' }
    );

    await admin.from('expenses').delete().eq('trip_id', tripId);
    await admin.from('settlements').delete().eq('trip_id', tripId);

    const { data: expense, error: expenseError } = await admin
      .from('expenses')
      .insert({
        trip_id: tripId,
        description: `E2E Pix Fixture Expense ${Date.now()}`,
        amount: 120,
        currency: 'BRL',
        date: getDaysFromNow(0),
        category: 'food',
        paid_by: owner.id,
        created_by: owner.id,
      })
      .select('id')
      .single();

    if (expenseError || !expense?.id) {
      return null;
    }

    await admin.from('expense_splits').insert([
      { expense_id: expense.id, user_id: owner.id, amount: 60, percentage: 50 },
      { expense_id: expense.id, user_id: peerUserId, amount: 60, percentage: 50 },
    ]);

    return tripId;
  } catch {
    return null;
  }
}

/**
 * Waits until an activity log entry with a specific title is persisted.
 * Requires service role key in local environment.
 */
export async function waitForActivityLogTitle(
  tripId: string,
  title: string,
  timeoutMs = 15000
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { data } = await admin
      .from('trip_activity_log')
      .select('metadata, entity_type')
      .eq('trip_id', tripId)
      .eq('entity_type', 'activity')
      .order('created_at', { ascending: false })
      .limit(20);

    const found = (data || []).some((entry) => {
      const metadata = entry.metadata as { title?: string } | null;
      return metadata?.title === title;
    });

    if (found) return true;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return false;
}

/**
 * Creates deterministic fixture data for an ended trip with recap available.
 */
export async function ensureFinishedTripRecapFixture(ownerEmail: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  try {
    const { data: owner } = await admin
      .from('users')
      .select('id')
      .eq('email', ownerEmail)
      .maybeSingle();
    if (!owner?.id) return null;

    const startDate = getDaysFromNow(-10);
    const endDate = getDaysFromNow(-5);

    const { data: existingTrips } = await admin
      .from('trips')
      .select('id')
      .eq('created_by', owner.id)
      .eq('description', RECAP_FIXTURE_DESCRIPTION)
      .order('created_at', { ascending: false })
      .limit(1);

    let tripId = existingTrips?.[0]?.id ?? null;

    if (!tripId) {
      const { data: createdTrip, error: createTripError } = await admin
        .from('trips')
        .insert({
          name: `E2E Recap Fixture ${Date.now()}`,
          destination: 'Lisboa',
          start_date: startDate,
          end_date: endDate,
          description: RECAP_FIXTURE_DESCRIPTION,
          style: 'cultural',
          created_by: owner.id,
        })
        .select('id')
        .single();

      if (createTripError || !createdTrip?.id) {
        return null;
      }
      tripId = createdTrip.id;
    } else {
      await admin
        .from('trips')
        .update({
          start_date: startDate,
          end_date: endDate,
          archived_at: null,
          style: 'cultural',
        })
        .eq('id', tripId);
    }

    await admin
      .from('trip_members')
      .upsert([{ trip_id: tripId, user_id: owner.id, role: 'organizer' }], {
        onConflict: 'trip_id,user_id',
      });

    await admin.from('expenses').delete().eq('trip_id', tripId);
    await admin.from('activities').delete().eq('trip_id', tripId);

    await admin.from('expenses').insert({
      trip_id: tripId,
      description: `E2E Recap Fixture Expense ${Date.now()}`,
      amount: 90,
      currency: 'BRL',
      date: endDate,
      category: 'food',
      paid_by: owner.id,
      created_by: owner.id,
    });

    return tripId;
  } catch {
    return null;
  }
}

/**
 * Creates (or logs into) an authenticated session to cover private routes.
 * Preference order:
 * 1) PLAYWRIGHT_E2E_EMAIL / PLAYWRIGHT_E2E_PASSWORD
 * 2) Create disposable user + login (when environment allows immediate login)
 */
export async function ensureAuthenticatedSession(page: Page): Promise<boolean> {
  await page.goto('/trips');
  if (!(await isOnLoginScreen(page))) {
    return true;
  }

  const envCredentials = getE2EAuthCredentials();
  if (envCredentials) {
    try {
      await loginUser(page, envCredentials);
      return true;
    } catch {
      // Fallback to disposable account flow.
    }
  }

  const disposableUser = generateTestUser();
  await registerUser(page, disposableUser);

  try {
    await loginUser(page, { email: disposableUser.email, password: disposableUser.password });
  } catch {
    // Some environments require e-mail confirmation before login.
  }

  await page.goto('/trips');
  return !(await isOnLoginScreen(page));
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
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const maybeFillDescription = async (description: string) => {
    const descriptionField = page
      .locator('input[name="description"], textarea[name="description"]')
      .last();
    if (
      (await descriptionField.count()) > 0 &&
      (await descriptionField.isVisible().catch(() => false))
    ) {
      await descriptionField.fill(description);
    }
  };

  const maybeFillDestination = async (destination: string) => {
    const destinationField = page.locator('input[name="destination"]').last();
    if (
      (await destinationField.count()) > 0 &&
      (await destinationField.isVisible().catch(() => false))
    ) {
      await destinationField.fill(destination);
      return true;
    }

    const locationField = page.locator('input[name="location"]').last();
    if ((await locationField.count()) > 0 && (await locationField.isVisible().catch(() => false))) {
      await locationField.fill(destination);
      return true;
    }

    return false;
  };

  const maybeSelectStyle = async (styleLabel: string) => {
    // Legacy UI had direct style buttons.
    const styleButton = page
      .getByRole('button', { name: new RegExp(escapeRegex(styleLabel), 'i') })
      .last();
    if ((await styleButton.count()) > 0 && (await styleButton.isVisible().catch(() => false))) {
      await styleButton.click();
      return;
    }

    // Wizard UI uses a combobox + options list.
    const styleTrigger = page.locator('button[role="combobox"]').first();
    if (
      (await styleTrigger.count()) === 0 ||
      !(await styleTrigger.isVisible().catch(() => false))
    ) {
      return;
    }
    await styleTrigger.click();

    const styleOption = page
      .getByRole('option', { name: new RegExp(escapeRegex(styleLabel), 'i') })
      .first();
    if ((await styleOption.count()) > 0) {
      await styleOption.click();
      return;
    }

    // Close dropdown when no matching style exists in current catalog.
    await page.keyboard.press('Escape');
  };

  // Open create trip dialog
  const createButton = page
    .locator('button:has-text("Nova viagem")')
    .or(page.locator('button:has-text("Criar primeira viagem")'));
  const nameField = page.locator('input[name="name"]').last();
  // Dynamic import + hydration can make the first click a no-op; retry quickly.
  let opened = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    await createButton.first().click();
    try {
      await nameField.waitFor({ state: 'visible', timeout: 3000 });
      opened = true;
      break;
    } catch {
      await page.waitForLoadState('networkidle');
    }
  }
  expect(opened, 'Não foi possível abrir o formulário de criação de viagem').toBe(true);
  await expect(nameField).toBeVisible();

  // Step 1 (shared)
  await nameField.fill(trip.name);
  await maybeFillDestination(trip.destination);
  if (trip.description) {
    await maybeFillDescription(trip.description);
  }

  // Wizard detection: date fields are rendered only after the first "Próximo".
  let isWizard = false;
  let startDateField = page.locator('input[name="start_date"]').last();
  if (!(await startDateField.isVisible().catch(() => false))) {
    const nextButton = page.getByRole('button', { name: /próximo/i }).last();
    if ((await nextButton.count()) > 0 && (await nextButton.isVisible().catch(() => false))) {
      isWizard = true;
      for (let attempt = 0; attempt < 3; attempt++) {
        await nextButton.click();
        if (await startDateField.isVisible().catch(() => false)) {
          break;
        }
        await page.waitForTimeout(400);
      }
    }
  }

  if (!(await startDateField.isVisible().catch(() => false))) {
    startDateField = page
      .locator('input[name="startDate"], input[name="start-date"], input[data-field="start_date"]')
      .last();
  }
  const endDateField = page
    .locator(
      'input[name="end_date"], input[name="endDate"], input[name="end-date"], input[data-field="end_date"]'
    )
    .last();
  await expect(
    startDateField,
    'Campo de data inicial não encontrado no formulário de viagem'
  ).toBeVisible();
  await expect(
    endDateField,
    'Campo de data final não encontrado no formulário de viagem'
  ).toBeVisible();

  // Dates
  await startDateField.fill(trip.startDate);
  await endDateField.fill(trip.endDate);

  if (trip.style) {
    await maybeSelectStyle(trip.style);
  }

  if (isWizard) {
    const nextButton = page.getByRole('button', { name: /próximo/i }).last();
    if ((await nextButton.count()) > 0 && (await nextButton.isVisible().catch(() => false))) {
      await nextButton.click();
    }
  }

  // Submit form (wizard + legacy compatibility)
  const createTripButton = page.getByRole('button', { name: /criar viagem/i }).last();
  if (
    (await createTripButton.count()) > 0 &&
    (await createTripButton.isVisible().catch(() => false))
  ) {
    await createTripButton.click();
  } else {
    await page.locator('button[type="submit"]').last().click();
  }

  // Wait for redirect to trip detail page
  await page.waitForURL(/\/trip\/[a-f0-9-]+(?:\/.*)?$/, { timeout: 10000 });
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
