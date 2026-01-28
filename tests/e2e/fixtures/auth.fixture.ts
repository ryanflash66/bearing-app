
import { test as base, expect, Page } from '@playwright/test';

/**
 * Shared Auth Fixture for E2E Tests
 * Extracted to eliminate duplicate login code across test files.
 * Per Code Review M1.
 * 
 * This fixture provides an `authenticatedPage` that is already logged in,
 * while still allowing tests to use the default `page` if unauthenticated access is needed.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD;
    if (!email || !password) {
      throw new Error("Missing TEST_EMAIL/TEST_PASSWORD. Set them in your local .env/.env.local for Playwright E2E.");
    }

    // Navigate to login (avoid `networkidle` which can be flaky in modern apps)
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type=\"submit\"]')).toBeEnabled();

    // Fill in credentials using specific selectors (id-based for this form)
    await page.fill('#email', email);
    await page.fill('#password', password);

    // Submit and wait for navigation to complete
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);

    // Secondary URL assertion for clarity
    await expect(page).toHaveURL(/\/dashboard/);

    // Page is now authenticated, continue with the test
    await use(page);
  },
});

export { expect };
