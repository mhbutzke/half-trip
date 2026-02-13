import { test, expect } from './setup';
import { createTrip, ensureAuthenticatedSession, getDaysFromNow } from './utils/test-helpers';

async function ensureTripId(page: import('@playwright/test').Page) {
  const authenticated = await ensureAuthenticatedSession(page);
  if (!authenticated) {
    return null;
  }
  await page.goto('/trips');

  const firstTripLink = page.locator('a[href^="/trip/"]').first();
  const hasTrips = (await firstTripLink.count()) > 0;

  if (!hasTrips) {
    await createTrip(page, {
      name: `Usability Trip ${Date.now()}`,
      destination: 'Sao Paulo',
      startDate: getDaysFromNow(5),
      endDate: getDaysFromNow(9),
      style: 'Negócios',
      description: 'Trip criada para auditoria de usabilidade',
    });
  } else {
    await firstTripLink.click();
    await page.waitForURL(/\/trip\/[a-f0-9-]+(?:\/.*)?$/);
  }

  const match = page.url().match(/\/trip\/([a-f0-9-]+)/);
  expect(match, 'Não foi possível extrair o ID da viagem').toBeTruthy();
  return match?.[1] as string;
}

async function ensureItineraryHasActivity(page: import('@playwright/test').Page) {
  const actionButton = page.locator('button[aria-label="Opções da atividade"]').first();
  if ((await actionButton.count()) > 0) {
    return;
  }

  const addButton = page
    .locator('button:has-text("Nova atividade")')
    .or(page.locator('button:has-text("Adicionar atividade")'));

  await addButton.first().click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.locator('[role="dialog"] input[name="title"]').fill(`Atividade ${Date.now()}`);

  const dateInput = page.locator('[role="dialog"] input[name="date"]');
  if (!(await dateInput.inputValue())) {
    await dateInput.fill(getDaysFromNow(6));
  }

  await page.getByRole('combobox', { name: /Categoria/i }).click();
  await page.getByRole('option', { name: 'Passeio' }).click();

  await page.locator('[role="dialog"] button[type="submit"]').click();
  await page.waitForTimeout(800);
}

test.describe('Usability Audit', () => {
  test.describe.configure({ timeout: 90000 });

  test('should load public pages and render primary actions', async ({ page }) => {
    const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/offline'];

    for (const route of publicRoutes) {
      const response = await page.goto(route);
      expect(response?.ok(), `Falha ao abrir rota pública ${route}`).toBeTruthy();
      await expect(page.locator('main')).toBeVisible();
      expect(await page.locator('button:visible, a:visible').count()).toBeGreaterThan(0);
    }
  });

  test('should load all core trip pages and render actionable controls', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    const tripId = await ensureTripId(page);
    test.skip(!tripId, 'Ambiente sem autenticação automática para testar páginas privadas.');

    const routes = [
      `/trip/${tripId}`,
      `/trip/${tripId}/itinerary`,
      `/trip/${tripId}/expenses`,
      `/trip/${tripId}/balance`,
      `/trip/${tripId}/budget`,
      `/trip/${tripId}/participants`,
      `/trip/${tripId}/checklists`,
      `/trip/${tripId}/notes`,
      '/settings',
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.ok(), `Falha ao abrir rota ${route}`).toBeTruthy();

      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('main')).toBeVisible();

      const controlsCount = await page.locator('button:visible, a:visible').count();
      expect(controlsCount, `Sem ações visíveis na rota ${route}`).toBeGreaterThan(0);

      await expect(page.locator('text=Página não encontrada')).toHaveCount(0);
      await expect(page.locator('text=Algo deu errado')).toHaveCount(0);
    }

    expect(runtimeErrors, `Erros de runtime detectados: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('mobile itinerary controls should be discoverable on touch', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('Mobile'), 'Teste específico para mobile');

    const tripId = await ensureTripId(page);
    test.skip(!tripId, 'Ambiente sem autenticação automática para testar páginas privadas.');

    await page.goto(`/trip/${tripId}/itinerary`);
    await page.waitForLoadState('domcontentloaded');

    await ensureItineraryHasActivity(page);

    const actionButton = page.locator('button[aria-label="Opções da atividade"]').first();
    const dragButton = page.locator('button[aria-label="Arrastar atividade"]').first();

    await expect(actionButton).toBeVisible();
    await expect(dragButton).toBeVisible();

    const actionOpacity = await actionButton.evaluate((el) =>
      Number.parseFloat(window.getComputedStyle(el).opacity)
    );
    const dragOpacity = await dragButton.evaluate((el) =>
      Number.parseFloat(window.getComputedStyle(el).opacity)
    );

    expect(actionOpacity).toBeGreaterThan(0.85);
    expect(dragOpacity).toBeGreaterThan(0.85);
  });
});
