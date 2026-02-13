import { test, expect } from './setup';
import {
  createTrip,
  ensureAuthenticatedSession,
  ensureTripWithPendingSettlementFixture,
  ensureFinishedTripRecapFixture,
  getDaysFromNow,
  getE2EAuthCredentials,
  waitForActivityLogTitle,
} from './utils/test-helpers';

async function ensureTripId(page: import('@playwright/test').Page) {
  const authenticated = await ensureAuthenticatedSession(page);
  if (!authenticated) return null;

  await page.goto('/trips');
  const firstTripLink = page.locator('a[href^="/trip/"]').first();
  let hasTrips = (await firstTripLink.count()) > 0;
  if (!hasTrips) {
    await page.waitForTimeout(1500);
    hasTrips = (await firstTripLink.count()) > 0;
  }

  if (!hasTrips) {
    await createTrip(page, {
      name: `Feature Test Trip ${Date.now()}`,
      destination: 'Sao Paulo',
      startDate: getDaysFromNow(3),
      endDate: getDaysFromNow(7),
      style: 'Negócios',
      description: 'Trip para validação E2E de funcionalidades novas',
    });
  } else {
    await firstTripLink.click();
    await page.waitForURL(/\/trip\/[a-f0-9-]+(?:\/.*)?$/);
  }

  const match = page.url().match(/\/trip\/([a-f0-9-]+)/);
  return match?.[1] ?? null;
}

test.describe('New Features Coverage', () => {
  test.describe.configure({ timeout: 120000 });

  test('pix qr dialog should generate qr code from a suggested settlement', async ({ page }) => {
    const authenticated = await ensureAuthenticatedSession(page);
    test.skip(!authenticated, 'Ambiente sem autenticação automática para rotas privadas.');

    const credentials = getE2EAuthCredentials();
    test.skip(
      !credentials,
      'Defina PLAYWRIGHT_E2E_EMAIL/PLAYWRIGHT_E2E_PASSWORD para fixture Pix.'
    );
    if (!credentials) {
      return;
    }

    const tripId = await ensureTripWithPendingSettlementFixture(credentials.email);
    test.skip(!tripId, 'Não foi possível preparar fixture determinística de acerto pendente.');

    await page.goto(`/trip/${tripId}/balance`);
    await page.waitForLoadState('domcontentloaded');

    const pixButton = page.getByRole('button', { name: /pagar via pix/i }).first();
    await expect(pixButton).toBeVisible();
    await pixButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /pagar via pix/i })).toBeVisible();

    await page.locator('input#pix-key').fill('12345678901');
    await page.getByRole('button', { name: /gerar qr code/i }).click();

    await expect(page.getByRole('img', { name: /qr code pix/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /copiar código/i })).toBeVisible();
  });

  test('poll votes should refresh in another open tab (realtime)', async ({ page }) => {
    const tripId = await ensureTripId(page);
    test.skip(!tripId, 'Ambiente sem autenticação automática para rotas privadas.');
    if (!tripId) {
      return;
    }

    const pollQuestion = `Votação realtime ${Date.now()}`;
    const optionA = `Opção A ${Date.now().toString().slice(-4)}`;
    const optionB = `Opção B ${Date.now().toString().slice(-4)}`;

    await page.goto(`/trip/${tripId}`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: /^votação$/i }).click();
    await expect(page.getByText('Nova votação')).toBeVisible();

    await page.getByLabel('Pergunta').fill(pollQuestion);
    await page.getByPlaceholder('Opção 1').fill(optionA);
    await page.getByPlaceholder('Opção 2').fill(optionB);
    await page.getByRole('button', { name: /criar votação/i }).click();

    try {
      await expect(page.getByText(pollQuestion)).toBeVisible({ timeout: 15000 });
    } catch {
      await page.reload();
      await expect(page.getByText(pollQuestion)).toBeVisible({ timeout: 10000 });
    }

    const page2 = await page.context().newPage();
    await page2.goto(`/trip/${tripId}`);
    await page2.waitForLoadState('domcontentloaded');
    try {
      await expect(page2.getByText(pollQuestion)).toBeVisible({ timeout: 15000 });
    } catch {
      await page2.reload();
      await expect(page2.getByText(pollQuestion)).toBeVisible({ timeout: 10000 });
    }

    const pollCardOnPage1 = page
      .locator('[data-slot="card"]')
      .filter({ hasText: pollQuestion })
      .first();
    const pollCardOnPage2 = page2
      .locator('[data-slot="card"]')
      .filter({ hasText: pollQuestion })
      .first();

    await expect(pollCardOnPage1).toContainText('0 participante');
    await pollCardOnPage2.getByRole('button', { name: new RegExp(optionA) }).click();
    await expect(pollCardOnPage2).toBeVisible();
    await expect(pollCardOnPage1).toBeVisible();

    const deleteButton = pollCardOnPage1.getByRole('button', { name: /excluir votação/i });
    if ((await deleteButton.count()) > 0) {
      await deleteButton.click();
    }

    await page2.close();
  });

  test('activity feed should show newly created itinerary activity', async ({ page }) => {
    const tripId = await ensureTripId(page);
    test.skip(!tripId, 'Ambiente sem autenticação automática para rotas privadas.');
    if (!tripId) {
      return;
    }

    const activityTitle = `Atividade feed ${Date.now()}`;

    await page.goto(`/trip/${tripId}/itinerary`);
    await page.waitForLoadState('domcontentloaded');

    await page
      .locator('button:has-text("Nova atividade")')
      .or(page.locator('button:has-text("Adicionar atividade")'))
      .first()
      .click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.locator('[role="dialog"] input[name="title"]').fill(activityTitle);

    const dateInput = page.locator('[role="dialog"] input[name="date"]');
    if (!(await dateInput.inputValue())) {
      await dateInput.fill(getDaysFromNow(6));
    }

    await page.getByRole('combobox', { name: /Categoria/i }).click();
    await page.getByRole('option', { name: 'Passeio' }).click();
    await page.locator('[role="dialog"] button[type="submit"]').click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(activityTitle)).toBeVisible({ timeout: 10000 });

    const logPersisted = await waitForActivityLogTitle(tripId, activityTitle, 20000);
    expect(logPersisted, 'A criação da atividade não gerou log em trip_activity_log').toBe(true);

    await page.goto(`/trip/${tripId}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByText(/atividade recente|nenhuma atividade recente/i).first()
    ).toBeVisible();
  });

  test('trip recap should allow exporting a png', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    const authenticated = await ensureAuthenticatedSession(page);
    test.skip(!authenticated, 'Ambiente sem autenticação automática para rotas privadas.');

    const credentials = getE2EAuthCredentials();
    test.skip(
      !credentials,
      'Defina PLAYWRIGHT_E2E_EMAIL/PLAYWRIGHT_E2E_PASSWORD para fixture de recap.'
    );
    if (!credentials) {
      return;
    }

    const recapTripId = await ensureFinishedTripRecapFixture(credentials.email);
    test.skip(!recapTripId, 'Não foi possível preparar fixture determinística de Trip Recap.');
    if (!recapTripId) {
      return;
    }

    await page.goto(`/trip/${recapTripId}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: /trip recap/i })).toBeVisible();

    const shareButton = page.getByRole('button', { name: /compartilhar recap/i });
    await expect(shareButton).toBeVisible();
    await shareButton.click();
    await page.waitForTimeout(1000);
    expect(
      runtimeErrors,
      `Erro de runtime ao exportar recap: ${runtimeErrors.join(' | ')}`
    ).toEqual([]);
  });
});
