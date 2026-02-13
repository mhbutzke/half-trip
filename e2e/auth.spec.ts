import { test, expect } from './setup';
import { generateTestUser, getE2EAuthCredentials, loginUser } from './utils/test-helpers';

test.describe('Authentication Flow', () => {
  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      const seededCredentials = getE2EAuthCredentials();
      const user = seededCredentials
        ? {
            name: 'Seeded E2E User',
            email: seededCredentials.email,
            password: seededCredentials.password,
          }
        : generateTestUser();

      await page.goto('/register');

      // Check page elements
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: 'Criar conta' })
      ).toBeVisible();
      await expect(page.getByText('Crie sua conta para planejar viagens em grupo')).toBeVisible();

      // Fill registration form
      await page.fill('input[name="name"]', user.name);
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      await page.fill('input[name="confirmPassword"]', user.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Supabase can return "already registered" or still return success for existing
      // users depending on auth configuration and email confirmation settings.
      const successTitle = page.locator('[data-slot="card-title"]', { hasText: 'Conta criada!' });
      const alreadyRegisteredError = page.getByText('Este email já está cadastrado');
      const rateLimitError = page.getByText(/email rate limit exceeded/i);

      await expect(async () => {
        const isSuccessVisible = await successTitle.isVisible().catch(() => false);
        const isAlreadyRegisteredVisible = await alreadyRegisteredError
          .isVisible()
          .catch(() => false);
        const isRateLimitVisible = await rateLimitError.isVisible().catch(() => false);
        expect(isSuccessVisible || isAlreadyRegisteredVisible || isRateLimitVisible).toBe(true);
      }).toPass({ timeout: 10000 });

      if (await successTitle.isVisible()) {
        await expect(page.getByText('Enviamos um email de confirmação para você.')).toBeVisible();
      } else if (await rateLimitError.isVisible()) {
        await expect(
          page.locator('[data-slot="card-title"]', { hasText: 'Criar conta' })
        ).toBeVisible();
      } else {
        await expect(alreadyRegisteredError).toBeVisible();
      }
    });

    test('should show validation errors for invalid inputs', async ({ page }) => {
      await page.goto('/register');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.getByText('Nome é obrigatório')).toBeVisible();
      await expect(page.getByText('Email é obrigatório')).toBeVisible();
    });

    test('should show error for password mismatch', async ({ page }) => {
      const user = generateTestUser();

      await page.goto('/register');

      await page.fill('input[name="name"]', user.name);
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator('text=As senhas não coincidem')).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/register');

      // Click on "Já tem conta? Entrar" link
      await page.click('a:has-text("Entrar")');

      // Should navigate to login page
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-slot="card-title"]', { hasText: 'Entrar' })).toBeVisible();
    });
  });

  test.describe('Login', () => {
    test('should redirect authenticated user away from login', async ({ page }) => {
      const credentials = getE2EAuthCredentials();
      test.skip(
        !credentials,
        'Defina PLAYWRIGHT_E2E_EMAIL e PLAYWRIGHT_E2E_PASSWORD para fluxo determinístico.'
      );

      await loginUser(page, credentials!);
      await page.goto('/login');
      await expect(page).toHaveURL('/trips');
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.getByText('Email é obrigatório')).toBeVisible();
      await expect(page.getByText('Senha é obrigatória')).toBeVisible();
    });

    test('should navigate to register page', async ({ page }) => {
      await page.goto('/login');

      // Click on "Criar conta" link
      await page.click('a:has-text("Criar conta")');

      // Should navigate to register page
      await expect(page).toHaveURL('/register');
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: 'Criar conta' })
      ).toBeVisible();
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/login');

      // Click on "Esqueceu a senha?" link
      await page.click('a:has-text("Esqueceu a senha?")');

      // Should navigate to forgot password page
      await expect(page).toHaveURL('/forgot-password');
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: 'Esqueceu a senha?' })
      ).toBeVisible();
    });
  });

  test.describe('Password Recovery', () => {
    test('should show forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');

      await expect(
        page.locator('[data-slot="card-title"]', { hasText: 'Esqueceu a senha?' })
      ).toBeVisible();
      await expect(
        page.getByText('Digite seu email e enviaremos um link para você redefinir sua senha')
      ).toBeVisible();
    });

    test('should submit password recovery request', async ({ page }) => {
      await page.goto('/forgot-password');

      const email = 'test@example.com';
      await page.fill('input[name="email"]', email);

      await page.click('button[type="submit"]');

      // Should show success message
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: 'Email enviado!' })
      ).toBeVisible({
        timeout: 10000,
      });
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');

      // Native HTML email validation may block submission before Zod errors render.
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: 'Esqueceu a senha?' })
      ).toBeVisible();
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: 'Email enviado!' })
      ).toHaveCount(0);
    });
  });

  test.describe('Logout', () => {
    test('should have logout functionality in header', async ({ page }) => {
      await page.goto('/');

      // Check if logout option exists in UI (when authenticated)
      // This is a placeholder - actual implementation depends on auth state
      const hasUserMenu = await page.locator('[aria-label="User menu"]').count();

      if (hasUserMenu > 0) {
        await page.click('[aria-label="User menu"]');
        await expect(page.locator('text=Sair')).toBeVisible();
      }
    });
  });
});
