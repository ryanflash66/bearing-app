import { test, expect } from '@playwright/test';

test.describe('Navigation Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    // Use environment variables for credentials or fallback to default test user
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'password123';

    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');

    // Wait for successful login and redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Manuscripts', href: '/dashboard/manuscripts' },
    { name: 'Settings', href: '/dashboard/settings' },
  ];

  for (const item of navItems) {
    test(`should navigate to ${item.name}`, async ({ page }) => {
      // Find the link in the sidebar
      // DashboardLayout sidebar links use the item name as text
      const sidebar = page.locator('aside nav');
      const link = sidebar.getByRole('link', { name: item.name });
      
      // Ensure the link is visible
      await expect(link).toBeVisible();

      // Click the link
      await link.click();

      // Assert URL is correct
      await expect(page).toHaveURL(item.href);

      // Assert the page header matches the item name (based on DashboardLayout implementation)
      // Assert the page header matches the item name.
      // We use .first() to handle cases where the header might appear twice (e.g. Layout H1 + Page H1)
      // while still working for pages that only rely on the Layout H1.
      await expect(page.getByRole('heading', { level: 1, name: item.name }).first()).toBeVisible();
      
      // Implicitly, this confirms a 200 OK (or at least successful rendering)
      // If we wanted to strictly check 200 OK for the navigation request, we could inspect network traffic,
      // but for client-side routing in Next.js, content verification is usually more robust.
    });
  }
});
