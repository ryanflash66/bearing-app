
import { test as base, expect } from '@playwright/test';

/**
 * Shared Auth Fixture for E2E Tests
 * Extracted to eliminate duplicate login code across test files.
 * Per Code Review M1.
 */
export const test = base.extend<{ authenticatedPage: typeof base }>({
  page: async ({ page }, use) => {
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'password123';

    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', email);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Page is now authenticated, continue with the test
    await use(page);
  },
});

export { expect };
