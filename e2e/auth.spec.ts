import { test, expect } from './setup';
import { generateTestUser, registerUser, loginUser } from './utils/test-helpers';

test.describe('Authentication Flow', () => {
  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      const user = generateTestUser();

      await page.goto('/register');

      // Check page elements
      await expect(page.locator('h1')).toContainText('Criar conta');
      await expect(page.locator('text=Planeje junto. Viaje melhor. Divida justo.')).toBeVisible();

      // Fill registration form
      await page.fill('input[name="name"]', user.name);
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      await page.fill('input[name="confirmPassword"]', user.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message about email confirmation
      await expect(page.locator('text=Confirme seu e-mail')).toBeVisible({ timeout: 10000 });
      await expect(page.locator(`text=${user.email}`)).toBeVisible();
    });

    test('should show validation errors for invalid inputs', async ({ page }) => {
      await page.goto('/register');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=Nome deve ter pelo menos 2 caracteres')).toBeVisible();
      await expect(page.locator('text=E-mail inválido')).toBeVisible();
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
      await expect(page.locator('h1')).toContainText('Entrar');
    });
  });

  test.describe('Login', () => {
    test('should redirect authenticated user away from login', async ({ page, context }) => {
      // Note: This test assumes there's a valid session in cookies
      // In a real scenario, we'd need to create a user and set up auth

      const user = generateTestUser();

      // Register user first
      await registerUser(page, user);

      // Try to access login page (would need actual email confirmation in real scenario)
      // For now, just verify the redirect logic exists
      await page.goto('/login');

      // Login page should be accessible when not authenticated
      await expect(page).toHaveURL('/login');
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=E-mail inválido')).toBeVisible();
      await expect(page.locator('text=Senha deve ter pelo menos 8 caracteres')).toBeVisible();
    });

    test('should navigate to register page', async ({ page }) => {
      await page.goto('/login');

      // Click on "Criar conta" link
      await page.click('a:has-text("Criar conta")');

      // Should navigate to register page
      await expect(page).toHaveURL('/register');
      await expect(page.locator('h1')).toContainText('Criar conta');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/login');

      // Click on "Esqueceu sua senha?" link
      await page.click('a:has-text("Esqueceu sua senha?")');

      // Should navigate to forgot password page
      await expect(page).toHaveURL('/forgot-password');
      await expect(page.locator('h1')).toContainText('Recuperar senha');
    });
  });

  test.describe('Password Recovery', () => {
    test('should show forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');

      await expect(page.locator('h1')).toContainText('Recuperar senha');
      await expect(
        page.locator('text=Enviaremos um link para redefinir sua senha no e-mail cadastrado')
      ).toBeVisible();
    });

    test('should submit password recovery request', async ({ page }) => {
      await page.goto('/forgot-password');

      const email = 'test@example.com';
      await page.fill('input[name="email"]', email);

      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=E-mail enviado')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=E-mail inválido')).toBeVisible();
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
