import { test, expect } from './setup';
import { createTrip, ensureAuthenticatedSession, getDaysFromNow } from './utils/test-helpers';

async function ensureTripId(page: import('@playwright/test').Page) {
  const authenticated = await ensureAuthenticatedSession(page);
  if (!authenticated) {
    return null;
  }
  await page.goto('/trips');

  const firstTripLink = page.locator('a[href^="/trip/"]').first();
  let hasTrips = (await firstTripLink.count()) > 0;
  if (!hasTrips) {
    await page.waitForTimeout(1500);
    hasTrips = (await firstTripLink.count()) > 0;
  }

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

async function expectFabAboveMobileNav(page: import('@playwright/test').Page, fabName: string) {
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  const fab = page.getByRole('button', { name: fabName }).first();

  await expect(nav).toBeVisible();
  await expect(fab).toBeVisible();

  const [fabBox, navBox] = await Promise.all([fab.boundingBox(), nav.boundingBox()]);
  expect(fabBox, 'FAB não encontrado').not.toBeNull();
  expect(navBox, 'Navegação mobile não encontrada').not.toBeNull();

  const fabBottom = fabBox!.y + fabBox!.height;
  expect(
    fabBottom,
    `FAB "${fabName}" está sobrepondo ou colado na navegação mobile`
  ).toBeLessThanOrEqual(navBox!.y - 4);
}

test.describe('Usability Audit', () => {
  test.describe.configure({ timeout: 90000 });

  test('should load public pages and render primary actions', async ({ page }) => {
    const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/offline'];

    for (const route of publicRoutes) {
      const response = await page.goto(route);
      expect(response?.ok(), `Falha ao abrir rota pública ${route}`).toBeTruthy();
      expect(
        new URL(page.url()).pathname,
        `Rota pública ${route} redirecionou para ${new URL(page.url()).pathname}`
      ).toBe(route);
      await expect(page.locator('main').first()).toBeVisible();
      expect(await page.locator('button:visible, a:visible').count()).toBeGreaterThan(0);
    }
  });

  test('offline page should stay public and render offline state', async ({ page }) => {
    const response = await page.goto('/offline');
    expect(response?.ok()).toBeTruthy();
    expect(new URL(page.url()).pathname).toBe('/offline');
    await expect(page.getByRole('heading', { name: 'Você está offline' })).toBeVisible();
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

      await expect(page.locator('main').first()).toBeVisible();

      const controlsCount = await page.locator('button:visible, a:visible').count();
      expect(controlsCount, `Sem ações visíveis na rota ${route}`).toBeGreaterThan(0);

      await expect(page.locator('text=Página não encontrada')).toHaveCount(0);
      await expect(page.locator('text=Algo deu errado')).toHaveCount(0);
    }

    const ignoredRuntimePatterns = [
      /Switched to client rendering because the server rendering errored:/i,
      /No QueryClient set, use QueryClientProvider to set one/i,
    ];
    const relevantRuntimeErrors = runtimeErrors.filter(
      (message) => !ignoredRuntimePatterns.some((pattern) => pattern.test(message))
    );

    expect(
      relevantRuntimeErrors,
      `Erros de runtime detectados: ${relevantRuntimeErrors.join(' | ')}`
    ).toEqual([]);
  });

  test('mobile itinerary controls should be discoverable on touch', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('Mobile'), 'Teste específico para mobile');

    const tripId = await ensureTripId(page);
    test.skip(!tripId, 'Ambiente sem autenticação automática para testar páginas privadas.');

    await page.goto(`/trip/${tripId}/itinerary`);
    await page.waitForLoadState('domcontentloaded');

    await ensureItineraryHasActivity(page);

    const dragButton = page.locator('button[aria-label="Arrastar atividade"]').first();
    await expect(dragButton).toBeVisible();

    const optionsButton = page.locator('button[aria-label="Opções da atividade"]').first();
    const hasOptionsButton = (await optionsButton.count()) > 0;

    if (hasOptionsButton) {
      await expect(optionsButton).toBeVisible();
      const optionsOpacity = await optionsButton.evaluate((el) =>
        Number.parseFloat(window.getComputedStyle(el).opacity)
      );
      expect(optionsOpacity).toBeGreaterThan(0.85);
    } else {
      const activityPrimaryControl = page
        .locator('button[aria-label^="Atividade"], button:has-text("Adicionar atividade")')
        .first();
      await expect(activityPrimaryControl).toBeVisible();
    }

    const dragOpacity = await dragButton.evaluate((el) =>
      Number.parseFloat(window.getComputedStyle(el).opacity)
    );
    expect(dragOpacity).toBeGreaterThan(0.85);

    const touchTargets = [
      page.getByRole('button', { name: 'Todas' }).first(),
      page.getByRole('button', { name: 'Voo' }).first(),
      dragButton,
    ];

    for (const target of touchTargets) {
      const box = await target.boundingBox();
      expect(box, 'Alvo de toque não encontrado').not.toBeNull();
      expect(box!.height, 'Alvo de toque menor que 40px de altura').toBeGreaterThanOrEqual(40);
      expect(box!.width, 'Alvo de toque menor que 40px de largura').toBeGreaterThanOrEqual(40);
    }

    await expectFabAboveMobileNav(page, 'Adicionar atividade');
  });

  test('mobile finance controls should keep touch-friendly targets', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('Mobile'), 'Teste específico para mobile');

    const tripId = await ensureTripId(page);
    test.skip(!tripId, 'Ambiente sem autenticação automática para testar páginas privadas.');

    await page.goto(`/trip/${tripId}/expenses`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Despesas' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Exportar|Exportando/i })).toBeVisible();
    await page.waitForTimeout(300);

    const expensesTargets = [
      page.getByRole('button', { name: /Exportar|Exportando/i }).first(),
      page.getByRole('button', { name: 'Alternar filtros' }).first(),
    ];

    for (const target of expensesTargets) {
      const box = await target.boundingBox();
      expect(box, 'Alvo de toque em despesas não encontrado').not.toBeNull();
      expect(
        box!.height,
        'Alvo de toque em despesas menor que 40px de altura'
      ).toBeGreaterThanOrEqual(40);
      expect(
        box!.width,
        'Alvo de toque em despesas menor que 40px de largura'
      ).toBeGreaterThanOrEqual(40);
    }

    const addExpenseFab = page.getByRole('button', { name: 'Adicionar despesa' });
    if ((await addExpenseFab.count()) > 0) {
      await expectFabAboveMobileNav(page, 'Adicionar despesa');
    } else {
      await expect(page.getByRole('button', { name: /Adicionar primeira despesa/i })).toBeVisible();
    }

    await page.goto(`/trip/${tripId}/balance`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Balanço' })).toBeVisible();
    await page.waitForTimeout(300);

    const balanceTargets = [
      page.getByRole('link', { name: 'Balanço' }).first(),
      page.getByRole('link', { name: 'Voltar' }).first(),
    ];

    for (const target of balanceTargets) {
      const box = await target.boundingBox();
      expect(box, 'Alvo de toque em balanço não encontrado').not.toBeNull();
      expect(
        box!.height,
        'Alvo de toque em balanço menor que 40px de altura'
      ).toBeGreaterThanOrEqual(40);
      expect(
        box!.width,
        'Alvo de toque em balanço menor que 40px de largura'
      ).toBeGreaterThanOrEqual(40);
    }
  });
});
