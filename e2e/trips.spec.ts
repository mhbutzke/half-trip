import { test, expect } from './setup';
import { getDaysFromNow } from './utils/test-helpers';

test.describe('Trip Management', () => {
  test.describe('Create Trip Flow', () => {
    test('should display empty state when no trips exist', async ({ page }) => {
      // Note: This would work better with a fresh user account
      await page.goto('/trips');

      // Check for empty state (might show login redirect if not authenticated)
      const hasEmptyState = await page.locator('text=Nenhuma viagem criada ainda').count();

      if (hasEmptyState > 0) {
        await expect(page.locator('text=Crie sua primeira viagem')).toBeVisible();
        await expect(page.locator('button:has-text("Criar primeira viagem")')).toBeVisible();
      }
    });

    test('should open create trip dialog', async ({ page }) => {
      await page.goto('/trips');

      // Click "Nova viagem" button (or "Criar primeira viagem" in empty state)
      const createButton = page
        .locator('button:has-text("Nova viagem")')
        .or(page.locator('button:has-text("Criar primeira viagem")'));

      await createButton.first().click();

      // Dialog should open
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('[role="dialog"] >> text=Criar nova viagem')).toBeVisible();
    });

    test('should validate required fields in create trip form', async ({ page }) => {
      await page.goto('/trips');

      // Open dialog
      const createButton = page
        .locator('button:has-text("Nova viagem")')
        .or(page.locator('button:has-text("Criar primeira viagem")'));

      await createButton.first().click();

      // Try to submit empty form
      await page.locator('[role="dialog"] >> button[type="submit"]').click();

      // Should show validation errors
      await expect(page.locator('text=Nome deve ter pelo menos 2 caracteres')).toBeVisible();
      await expect(page.locator('text=Destino deve ter pelo menos 2 caracteres')).toBeVisible();
    });

    test('should create a trip successfully', async ({ page }) => {
      await page.goto('/trips');

      // Open dialog
      const createButton = page
        .locator('button:has-text("Nova viagem")')
        .or(page.locator('button:has-text("Criar primeira viagem")'));

      await createButton.first().click();

      // Fill form
      const tripName = `Trip to Beach ${Date.now()}`;
      await page.locator('[role="dialog"] >> input[name="name"]').fill(tripName);
      await page.locator('[role="dialog"] >> input[name="destination"]').fill('Rio de Janeiro');
      await page.locator('[role="dialog"] >> input[name="start_date"]').fill(getDaysFromNow(7));
      await page.locator('[role="dialog"] >> input[name="end_date"]').fill(getDaysFromNow(14));

      // Select style (e.g., "Praia")
      await page.locator('[role="dialog"] >> button:has-text("Praia")').click();

      // Add description
      await page
        .locator('[role="dialog"] >> textarea[name="description"]')
        .fill('Uma viagem incrível para relaxar na praia');

      // Submit
      await page.locator('[role="dialog"] >> button[type="submit"]').click();

      // Should redirect to trip detail page
      await expect(page).toHaveURL(/\/trip\/[a-f0-9-]+$/, { timeout: 10000 });

      // Should show trip name
      await expect(page.locator(`text=${tripName}`)).toBeVisible();
    });

    test('should validate end date is after start date', async ({ page }) => {
      await page.goto('/trips');

      // Open dialog
      const createButton = page
        .locator('button:has-text("Nova viagem")')
        .or(page.locator('button:has-text("Criar primeira viagem")'));

      await createButton.first().click();

      // Fill with invalid dates
      await page.locator('[role="dialog"] >> input[name="name"]').fill('Invalid Trip');
      await page.locator('[role="dialog"] >> input[name="destination"]').fill('Somewhere');
      await page.locator('[role="dialog"] >> input[name="start_date"]').fill(getDaysFromNow(14));
      await page.locator('[role="dialog"] >> input[name="end_date"]').fill(getDaysFromNow(7)); // End before start

      // Submit
      await page.locator('[role="dialog"] >> button[type="submit"]').click();

      // Should show validation error
      await expect(
        page.locator('text=Data de término deve ser após ou igual à data de início')
      ).toBeVisible();
    });
  });

  test.describe('Trip List View', () => {
    test('should display trip cards with correct information', async ({ page }) => {
      await page.goto('/trips');

      // Check if there are any trips
      const tripCards = page.locator('[data-testid="trip-card"]');
      const count = await tripCards.count();

      if (count > 0) {
        const firstCard = tripCards.first();

        // Should have trip name
        await expect(firstCard.locator('h3')).toBeVisible();

        // Should have destination
        await expect(firstCard.locator('text=📍')).toBeVisible();

        // Should have dates
        await expect(firstCard.locator('text=📅')).toBeVisible();
      }
    });

    test('should have tabs for active and archived trips', async ({ page }) => {
      await page.goto('/trips');

      // Check for tabs
      await expect(page.locator('button:has-text("Ativas")')).toBeVisible();
      await expect(page.locator('button:has-text("Arquivadas")')).toBeVisible();

      // Click archived tab
      await page.click('button:has-text("Arquivadas")');

      // Should show archived trips or empty state
      const hasArchivedEmptyState = await page.locator('text=Nenhuma viagem arquivada').count();

      if (hasArchivedEmptyState > 0) {
        await expect(page.locator('text=Viagens arquivadas aparecem aqui')).toBeVisible();
      }
    });
  });

  test.describe('Trip Detail View', () => {
    test('should display trip overview cards', async ({ page }) => {
      // Navigate to any trip (if exists)
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Should show overview cards
        await expect(
          page.locator('text=Roteiro').or(page.locator('text=Itinerário'))
        ).toBeVisible();
        await expect(page.locator('text=Despesas')).toBeVisible();
        await expect(page.locator('text=Participantes')).toBeVisible();
        await expect(page.locator('text=Anotações').or(page.locator('text=Notas'))).toBeVisible();
      }
    });

    test('should navigate to itinerary page', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        const href = await tripLink.getAttribute('href');
        if (href) {
          await tripLink.click();

          // Click on itinerary card or link
          const itineraryLink = page
            .locator('a:has-text("Ver roteiro")')
            .or(page.locator('a[href$="/itinerary"]'));

          await itineraryLink.first().click();

          // Should navigate to itinerary page
          await expect(page).toHaveURL(/\/trip\/[a-f0-9-]+\/itinerary$/);
        }
      }
    });
  });

  test.describe('Trip Actions', () => {
    test('should open edit trip dialog for organizers', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Look for edit button (might be in dropdown menu)
        const moreButton = page.locator('button[aria-label="Ações da viagem"]');
        const hasMoreButton = (await moreButton.count()) > 0;

        if (hasMoreButton) {
          await moreButton.click();

          // Check for edit option
          const editOption = page.locator('text=Editar');
          const hasEditOption = (await editOption.count()) > 0;

          if (hasEditOption) {
            await editOption.click();

            // Should open edit dialog
            await expect(page.locator('[role="dialog"]')).toBeVisible();
            await expect(page.locator('[role="dialog"] >> text=Editar viagem')).toBeVisible();
          }
        }
      }
    });

    test('should show share/invite button', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Should have share/invite button
        const shareButton = page
          .locator('button:has-text("Compartilhar")')
          .or(page.locator('button:has-text("Convidar")'));

        await expect(shareButton.first()).toBeVisible();
      }
    });
  });
});
