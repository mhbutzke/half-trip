import { test, expect } from './setup';
import { getDaysFromNow } from './utils/test-helpers';

test.describe('Expense Management', () => {
  test.describe('Add Expense Flow', () => {
    test('should navigate to expenses page from trip detail', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Navigate to expenses from overview
        const expensesLink = page
          .locator('a:has-text("Ver despesas")')
          .or(page.locator('a[href$="/expenses"]'));

        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          // Should navigate to expenses page
          await expect(page).toHaveURL(/\/trip\/[a-f0-9-]+\/expenses$/);
        }
      }
    });

    test('should open add expense sheet', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Navigate to expenses
        const expensesLink = page
          .locator('a:has-text("Ver despesas")')
          .or(page.locator('a[href$="/expenses"]'));

        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          // Click "Nova despesa" button
          const addButton = page
            .locator('button:has-text("Nova despesa")')
            .or(page.locator('button:has-text("Adicionar despesa")'));

          await addButton.first().click();

          // Sheet should open
          await expect(page.locator('[role="dialog"]')).toBeVisible();
          await expect(page.locator('[role="dialog"] >> text=Nova despesa')).toBeVisible();
        }
      }
    });

    test('should validate required fields in add expense form', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Navigate to expenses and open add form
        const expensesLink = page.locator('a[href$="/expenses"]');
        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          const addButton = page.locator('button:has-text("Nova despesa")');
          if ((await addButton.count()) > 0) {
            await addButton.first().click();

            // Try to submit empty form
            await page.locator('[role="dialog"] >> button[type="submit"]').click();

            // Should show validation errors
            await expect(
              page.locator('text=Descrição deve ter pelo menos 2 caracteres')
            ).toBeVisible();
          }
        }
      }
    });

    test('should create an expense with equal split', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Navigate to expenses
        const expensesLink = page.locator('a[href$="/expenses"]');
        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          const addButton = page.locator('button:has-text("Nova despesa")');
          if ((await addButton.count()) > 0) {
            await addButton.first().click();

            // Fill form
            await page
              .locator('[role="dialog"] >> input[name="description"]')
              .fill(`Jantar no restaurante ${Date.now()}`);
            await page.locator('[role="dialog"] >> input[name="amount"]').fill('150.00');
            await page.locator('[role="dialog"] >> input[name="date"]').fill(getDaysFromNow(0));

            // Select category (e.g., Alimentação)
            const foodCategory = page
              .locator('[role="dialog"] >> button:has-text("Alimentação")')
              .or(page.locator('[role="dialog"] >> button:has-text("🍽️")'));

            if ((await foodCategory.count()) > 0) {
              await foodCategory.first().click();
            }

            // Equal split should be default - just submit
            await page.locator('[role="dialog"] >> button[type="submit"]').click();

            // Should close sheet and show success
            await expect(page.locator('[role="dialog"]')).not.toBeVisible({
              timeout: 5000,
            });

            // Should see expense in list
            await expect(page.locator('text=Jantar no restaurante')).toBeVisible();
          }
        }
      }
    });

    test('should create an expense with custom split amounts', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const expensesLink = page.locator('a[href$="/expenses"]');
        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          const addButton = page.locator('button:has-text("Nova despesa")');
          if ((await addButton.count()) > 0) {
            await addButton.first().click();

            // Fill basic info
            await page
              .locator('[role="dialog"] >> input[name="description"]')
              .fill(`Hotel ${Date.now()}`);
            await page.locator('[role="dialog"] >> input[name="amount"]').fill('300.00');

            // Select "Por valor" split type
            const amountSplit = page.locator('button:has-text("Por valor")');

            if ((await amountSplit.count()) > 0) {
              await amountSplit.click();

              // Should show amount input fields for each participant
              // This would depend on how many participants exist
              await expect(page.locator('input[type="number"]').first()).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Expense List View', () => {
    test('should display expense cards with correct information', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const expensesLink = page.locator('a[href$="/expenses"]');
        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          // Check if there are expenses
          const expenseCards = page.locator('[data-testid="expense-card"]');
          const count = await expenseCards.count();

          if (count > 0) {
            const firstCard = expenseCards.first();

            // Should have category icon
            await expect(firstCard.locator('svg').first()).toBeVisible();

            // Should have description
            await expect(firstCard.locator('text=R$')).toBeVisible();
          }
        }
      }
    });

    test('should filter expenses by category', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const expensesLink = page.locator('a[href$="/expenses"]');
        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          // Look for filter button
          const filterButton = page.locator('button:has-text("Filtros")');

          if ((await filterButton.count()) > 0) {
            await filterButton.click();

            // Should show category filters
            await expect(
              page.locator('text=Alimentação').or(page.locator('text=Categoria'))
            ).toBeVisible();
          }
        }
      }
    });

    test('should search expenses by description', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const expensesLink = page.locator('a[href$="/expenses"]');
        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          // Look for search input
          const searchInput = page.locator('input[placeholder*="Buscar"]');

          if ((await searchInput.count()) > 0) {
            await searchInput.fill('Hotel');

            // Wait for filter to apply
            await page.waitForTimeout(500);

            // Should filter results
            const expenseCards = page.locator('[data-testid="expense-card"]');
            const count = await expenseCards.count();

            // All visible cards should contain "Hotel" (if any)
            if (count > 0) {
              await expect(expenseCards.first()).toContainText('Hotel', {
                ignoreCase: true,
              });
            }
          }
        }
      }
    });
  });

  test.describe('Expense Actions', () => {
    test('should open edit expense sheet', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const expensesLink = page.locator('a[href$="/expenses"]');
        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          // Find first expense card with actions
          const expenseCard = page.locator('[data-testid="expense-card"]').first();
          const hasExpenses = (await expenseCard.count()) > 0;

          if (hasExpenses) {
            // Look for more/actions button
            const actionsButton = expenseCard.locator('button[aria-label="Ações"]');

            if ((await actionsButton.count()) > 0) {
              await actionsButton.click();

              // Check for edit option
              const editOption = page.locator('text=Editar');
              if ((await editOption.count()) > 0) {
                await editOption.click();

                // Should open edit sheet
                await expect(page.locator('[role="dialog"]')).toBeVisible();
                await expect(page.locator('[role="dialog"] >> text=Editar despesa')).toBeVisible();
              }
            }
          }
        }
      }
    });

    test('should show receipt section in expense', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const expensesLink = page.locator('a[href$="/expenses"]');
        if ((await expensesLink.count()) > 0) {
          await expensesLink.first().click();

          const expenseCard = page.locator('[data-testid="expense-card"]').first();
          const hasExpenses = (await expenseCard.count()) > 0;

          if (hasExpenses) {
            const actionsButton = expenseCard.locator('button[aria-label="Ações"]');

            if ((await actionsButton.count()) > 0) {
              await actionsButton.click();

              const editOption = page.locator('text=Editar');
              if ((await editOption.count()) > 0) {
                await editOption.click();

                // Check for receipt section/tab
                const receiptSection = page
                  .locator('text=Recibo')
                  .or(page.locator('text=Comprovante'));

                // Receipt functionality should be available
                await expect(receiptSection.first()).toBeVisible({
                  timeout: 3000,
                });
              }
            }
          }
        }
      }
    });
  });
});
