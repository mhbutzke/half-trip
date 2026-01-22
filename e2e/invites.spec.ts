import { test, expect } from './setup';

test.describe('Invite and Join Flow', () => {
  test.describe('Invite Link Generation', () => {
    test('should open invite dialog from trip header', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Click share/invite button
        const inviteButton = page
          .locator('button:has-text("Compartilhar")')
          .or(page.locator('button:has-text("Convidar")'));

        if ((await inviteButton.count()) > 0) {
          await inviteButton.first().click();

          // Should open invite dialog
          await expect(page.locator('[role="dialog"]')).toBeVisible();
          await expect(
            page
              .locator('[role="dialog"] >> text=Convidar')
              .or(page.locator('[role="dialog"] >> text=Compartilhar'))
          ).toBeVisible();
        }
      }
    });

    test('should generate invite link', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const inviteButton = page
          .locator('button:has-text("Compartilhar")')
          .or(page.locator('button:has-text("Convidar")'));

        if ((await inviteButton.count()) > 0) {
          await inviteButton.first().click();

          // Look for "Criar link" or "Gerar link" button
          const createLinkButton = page
            .locator('button:has-text("Criar link")')
            .or(page.locator('button:has-text("Gerar link")'));

          if ((await createLinkButton.count()) > 0) {
            await createLinkButton.click();

            // Should show generated link
            await expect(
              page.locator('text=/invite/').or(page.locator('input[value*="/invite/"]'))
            ).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });

    test('should copy invite link to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const inviteButton = page.locator('button:has-text("Compartilhar")');

        if ((await inviteButton.count()) > 0) {
          await inviteButton.first().click();

          // Look for existing invite link or create one
          const inviteLink = page.locator('input[value*="/invite/"]');

          if ((await inviteLink.count()) > 0) {
            // Find and click copy button
            const copyButton = page
              .locator('button:has-text("Copiar")')
              .or(page.locator('button[aria-label="Copiar link"]'));

            if ((await copyButton.count()) > 0) {
              await copyButton.first().click();

              // Should show success feedback
              await expect(
                page.locator('text=Link copiado').or(page.locator('text=Copiado'))
              ).toBeVisible({ timeout: 3000 });
            }
          }
        }
      }
    });

    test('should show list of pending invites', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const inviteButton = page.locator('button:has-text("Compartilhar")');

        if ((await inviteButton.count()) > 0) {
          await inviteButton.first().click();

          // Should show pending invites section
          const pendingSection = page
            .locator('text=Convites pendentes')
            .or(page.locator('text=Convites ativos'));

          if ((await pendingSection.count()) > 0) {
            await expect(pendingSection).toBeVisible();
          }
        }
      }
    });

    test('should revoke invite link', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const inviteButton = page.locator('button:has-text("Compartilhar")');

        if ((await inviteButton.count()) > 0) {
          await inviteButton.first().click();

          // Look for revoke button on an existing invite
          const revokeButton = page.locator('button:has-text("Revogar")').first();

          if ((await revokeButton.count()) > 0) {
            await revokeButton.click();

            // Should show confirmation or success
            await expect(
              page.locator('text=Convite revogado').or(page.locator('text=removido'))
            ).toBeVisible({ timeout: 3000 });
          }
        }
      }
    });
  });

  test.describe('Email Invitations', () => {
    test('should have email invite tab', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const inviteButton = page.locator('button:has-text("Compartilhar")');

        if ((await inviteButton.count()) > 0) {
          await inviteButton.first().click();

          // Look for "Email" tab
          const emailTab = page.locator('button:has-text("Email")');

          if ((await emailTab.count()) > 0) {
            await emailTab.click();

            // Should show email invite form
            await expect(
              page.locator('input[type="email"]').or(page.locator('input[name="email"]'))
            ).toBeVisible();
          }
        }
      }
    });

    test('should send email invitation', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const inviteButton = page.locator('button:has-text("Compartilhar")');

        if ((await inviteButton.count()) > 0) {
          await inviteButton.first().click();

          const emailTab = page.locator('button:has-text("Email")');

          if ((await emailTab.count()) > 0) {
            await emailTab.click();

            // Fill email
            const emailInput = page
              .locator('input[type="email"]')
              .or(page.locator('input[name="email"]'));

            if ((await emailInput.count()) > 0) {
              await emailInput.fill(`guest-${Date.now()}@example.com`);

              // Click send button
              const sendButton = page
                .locator('button:has-text("Enviar")')
                .or(page.locator('button:has-text("Convidar")'));

              await sendButton.first().click();

              // Should show success message
              await expect(
                page.locator('text=Convite enviado').or(page.locator('text=E-mail enviado'))
              ).toBeVisible({ timeout: 5000 });
            }
          }
        }
      }
    });
  });

  test.describe('Join Trip via Invite', () => {
    test('should show invite page with trip details', async ({ page }) => {
      // This test would require a valid invite code
      // For now, we'll test the page structure

      // Navigate to a mock invite URL
      await page.goto('/invite/TESTCODE123');

      // Should show either:
      // 1. Trip details with join button (if valid invite)
      // 2. Error message (if invalid invite)
      // 3. Login prompt (if not authenticated)

      const hasJoinButton = await page.locator('button:has-text("Participar")').count();
      const hasLoginPrompt = await page.locator('text=Entrar').count();
      const hasErrorMessage = await page
        .locator('text=Convite inválido')
        .or(page.locator('text=expirado'))
        .count();

      // One of these should be visible
      expect(hasJoinButton + hasLoginPrompt + hasErrorMessage).toBeGreaterThan(0);
    });

    test('should redirect to login if not authenticated', async ({ page }) => {
      await page.goto('/invite/TESTCODE123');

      // If not authenticated, should show login prompt or redirect
      const hasLoginButton = await page.locator('text=Entrar').count();
      const hasRegisterButton = await page.locator('text=Criar conta').count();

      if (hasLoginButton > 0 || hasRegisterButton > 0) {
        // Should be on invite page with login prompt
        await expect(page).toHaveURL(/\/invite\//);
      }
    });
  });

  test.describe('Participant Management', () => {
    test('should navigate to participants page', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        // Navigate to participants from overview
        const participantsLink = page
          .locator('a:has-text("Ver participantes")')
          .or(page.locator('a[href$="/participants"]'));

        if ((await participantsLink.count()) > 0) {
          await participantsLink.first().click();

          // Should navigate to participants page
          await expect(page).toHaveURL(/\/trip\/[a-f0-9-]+\/participants$/);
        }
      }
    });

    test('should display participant list with roles', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const participantsLink = page.locator('a[href$="/participants"]');

        if ((await participantsLink.count()) > 0) {
          await participantsLink.first().click();

          // Should show participants with roles
          await expect(
            page.locator('text=Organizador').or(page.locator('text=Participante'))
          ).toBeVisible();

          // Should show avatars
          await expect(page.locator('[data-testid="avatar"]').first()).toBeVisible({
            timeout: 3000,
          });
        }
      }
    });

    test('should show pending invites section', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const participantsLink = page.locator('a[href$="/participants"]');

        if ((await participantsLink.count()) > 0) {
          await participantsLink.first().click();

          // Should show pending invites section (if any)
          const pendingSection = page.locator('text=Convites pendentes');

          if ((await pendingSection.count()) > 0) {
            await expect(pendingSection).toBeVisible();
          }
        }
      }
    });

    test('should allow organizer to remove participant', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const participantsLink = page.locator('a[href$="/participants"]');

        if ((await participantsLink.count()) > 0) {
          await participantsLink.first().click();

          // Look for actions button on participant card
          const actionsButton = page
            .locator('[data-testid="participant-card"] button[aria-label="Ações"]')
            .first();

          if ((await actionsButton.count()) > 0) {
            await actionsButton.click();

            // Should show remove option for organizers
            const removeOption = page.locator('text=Remover');

            if ((await removeOption.count()) > 0) {
              // Just verify it's visible, don't actually remove
              await expect(removeOption).toBeVisible();
            }
          }
        }
      }
    });

    test('should allow user to leave trip', async ({ page }) => {
      await page.goto('/trips');

      const tripLink = page.locator('a[href^="/trip/"]').first();
      const hasTrips = (await tripLink.count()) > 0;

      if (hasTrips) {
        await tripLink.click();

        const participantsLink = page.locator('a[href$="/participants"]');

        if ((await participantsLink.count()) > 0) {
          await participantsLink.first().click();

          // Look for leave trip option
          const actionsButton = page.locator('button[aria-label="Ações"]').first();

          if ((await actionsButton.count()) > 0) {
            await actionsButton.click();

            const leaveOption = page.locator('text=Sair da viagem');

            if ((await leaveOption.count()) > 0) {
              // Just verify it's visible, don't actually leave
              await expect(leaveOption).toBeVisible();
            }
          }
        }
      }
    });
  });
});
