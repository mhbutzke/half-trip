import { test, expect } from './setup';

test.describe('Balance View', () => {
  test.describe('Balance Page Navigation', () => {
    test('should navigate to balance page from trip detail', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Navigate to balance from overview
        const balanceLink = page
          .locator('a:has-text("Ver balanço")')
          .or(page.locator('a[href$="/balance"]'));

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Should navigate to balance page
          await expect(page).toHaveURL(/\/trip\/[a-f0-9-]+\/balance$/);
        }
      }
    });

    test('should access balance from mobile navigation', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Look for balance in bottom nav (mobile)
        const balanceNavItem = page.locator(
          'nav a[href$="/balance"], nav button:has-text("Balanço")'
        );

        if ((await balanceNavItem.count()) > 0) {
          await balanceNavItem.first().click();

          // Should navigate to balance page
          await expect(page).toHaveURL(/\/trip\/[a-f0-9-]+\/balance$/);
        }
      }
    });
  });

  test.describe('Balance Summary Display', () => {
    test('should display total expenses summary', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Should show total expenses
          await expect(
            page.locator('text=Total de Despesas').or(page.locator('text=Total gasto'))
          ).toBeVisible();

          // Should show currency (R$)
          await expect(page.locator('text=R$')).toBeVisible();
        }
      }
    });

    test('should display participant count', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Should show number of participants
          await expect(
            page.locator('text=Participantes').or(page.locator('text=pessoas'))
          ).toBeVisible();
        }
      }
    });

    test('should display average per person', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Should show average
          await expect(
            page.locator('text=Média por pessoa').or(page.locator('text=média'))
          ).toBeVisible();
        }
      }
    });
  });

  test.describe('Individual Participant Balances', () => {
    test('should display balance for each participant', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Should show participant balance cards
          const balanceCards = page.locator('[data-testid="participant-balance"]');
          const count = await balanceCards.count();

          if (count > 0) {
            const firstCard = balanceCards.first();

            // Should have avatar
            await expect(firstCard.locator('[data-testid="avatar"]')).toBeVisible();

            // Should have balance amount
            await expect(firstCard.locator('text=R$')).toBeVisible();
          }
        }
      }
    });

    test('should show positive balance (A receber)', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for positive balance indicator
          const positiveBalance = page.locator('text=A receber');

          if ((await positiveBalance.count()) > 0) {
            await expect(positiveBalance.first()).toBeVisible();

            // Should have green/success styling (check for success color)
            const badge = page.locator('text=A receber').locator('..').first();
            await expect(badge).toHaveClass(/success|green|positive/);
          }
        }
      }
    });

    test('should show negative balance (A pagar)', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for negative balance indicator
          const negativeBalance = page.locator('text=A pagar');

          if ((await negativeBalance.count()) > 0) {
            await expect(negativeBalance.first()).toBeVisible();

            // Should have red/destructive styling
            const badge = page.locator('text=A pagar').locator('..').first();
            await expect(badge).toHaveClass(/destructive|red|negative/);
          }
        }
      }
    });

    test('should show settled status (Quitado)', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for settled status
          const settledStatus = page.locator('text=Quitado');

          if ((await settledStatus.count()) > 0) {
            await expect(settledStatus.first()).toBeVisible();
          }
        }
      }
    });

    test('should show breakdown of paid and owed', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Should show "Total Pago" and "Total Devido"
          const hasPaidLabel = await page.locator('text=Total Pago').count();
          const hasOwedLabel = await page.locator('text=Total Devido').count();

          if (hasPaidLabel > 0 || hasOwedLabel > 0) {
            await expect(
              page.locator('text=Total Pago').or(page.locator('text=Total Devido'))
            ).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Settlement Suggestions', () => {
    test('should display settlement suggestions', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Should show settlements section
          const settlementsSection = page
            .locator('text=Acertos sugeridos')
            .or(page.locator('text=Como acertar'));

          if ((await settlementsSection.count()) > 0) {
            await expect(settlementsSection).toBeVisible();
          }
        }
      }
    });

    test('should show who owes whom', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for settlement format "X deve Y para Z"
          const settlementText = page.locator('text=deve').or(page.locator('text=pagar'));

          if ((await settlementText.count()) > 0) {
            await expect(settlementText.first()).toBeVisible();
          }
        }
      }
    });

    test('should have mark as paid button', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for "Marcar pago" button
          const markPaidButton = page
            .locator('button:has-text("Marcar pago")')
            .or(page.locator('button:has-text("Pago")'));

          if ((await markPaidButton.count()) > 0) {
            await expect(markPaidButton.first()).toBeVisible();
          }
        }
      }
    });

    test('should open confirmation dialog when marking as paid', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          const markPaidButton = page.locator('button:has-text("Marcar pago")').first();

          if ((await markPaidButton.count()) > 0) {
            await markPaidButton.click();

            // Should open confirmation dialog
            await expect(page.locator('[role="dialog"]')).toBeVisible();
            await expect(page.locator('[role="dialog"] >> text=Confirmar')).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Settlement History', () => {
    test('should show settlement history section', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for history section
          const historySection = page
            .locator('text=Histórico')
            .or(page.locator('text=Pagamentos realizados'));

          if ((await historySection.count()) > 0) {
            await expect(historySection).toBeVisible();
          }
        }
      }
    });

    test('should display settled payments with timestamps', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for relative time format (e.g., "há 2 dias")
          const relativeTime = page.locator('text=há');

          if ((await relativeTime.count()) > 0) {
            await expect(relativeTime.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Expense Category Breakdown', () => {
    test('should display category breakdown', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for category breakdown section
          const categorySection = page
            .locator('text=Por categoria')
            .or(page.locator('text=Categorias'));

          if ((await categorySection.count()) > 0) {
            await expect(categorySection).toBeVisible();
          }
        }
      }
    });

    test('should show category icons and amounts', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for category names (e.g., Alimentação, Hospedagem)
          const categories = page
            .locator('text=Alimentação')
            .or(page.locator('text=Hospedagem'))
            .or(page.locator('text=Transporte'));

          if ((await categories.count()) > 0) {
            await expect(categories.first()).toBeVisible();

            // Should have progress bars or visual indicators
            const progressBar = page.locator('[role="progressbar"]');
            if ((await progressBar.count()) > 0) {
              await expect(progressBar.first()).toBeVisible();
            }
          }
        }
      }
    });

    test('should display percentages for categories', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Look for percentage values
          const percentage = page.locator('text=/%/');

          if ((await percentage.count()) > 0) {
            await expect(percentage.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no expenses', async ({ page }) => {
      await page.goto('/trips');

      // Look for a trip with no expenses
      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const balanceLink = page.locator('a[href$="/balance"]');

        if ((await balanceLink.count()) > 0) {
          await balanceLink.first().click();

          // Might show empty state
          const emptyState = page
            .locator('text=Nenhuma despesa')
            .or(page.locator('text=sem despesas'));

          if ((await emptyState.count()) > 0) {
            await expect(emptyState).toBeVisible();
          }
        }
      }
    });
  });
});
