import { test, expect } from "./fixtures/auth.fixture";

/**
 * Story 8.13: My Orders / Service tracking
 * E2E Tests for AC 8.13.1, AC 8.13.3
 */
test.describe('My Orders Page', () => {
  test('AC 8.13.1: User can navigate to /dashboard/orders and see list', async ({ authenticatedPage: page }) => {
    // Navigate to orders page
    await page.goto('/dashboard/orders');

    // Page should load successfully
    await expect(page).toHaveURL('/dashboard/orders');

    // Should see the page header
    await expect(page.getByRole('heading', { level: 2, name: 'My Orders' })).toBeVisible();

    // Should see either orders list or empty state
    const ordersList = page.locator('ul[role="list"]');
    const emptyState = page.getByText('No service requests found');

    // One of these should be visible
    const hasOrders = await ordersList.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasOrders || isEmpty).toBeTruthy();
  });

  test('AC 8.13.2: Empty state shows marketplace link', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/orders');

    // If empty state is shown, it should have marketplace link
    const emptyState = page.getByText('No service requests found');
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      const marketplaceLink = page.getByRole('link', { name: 'Browse the marketplace' });
      await expect(marketplaceLink).toBeVisible();
      await expect(marketplaceLink).toHaveAttribute('href', '/dashboard/marketplace');
    }
  });

  test('AC 8.13.1: Orders list displays required columns', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/orders');

    // If there are orders, verify the display
    const ordersList = page.locator('ul[role="list"]');
    const hasOrders = await ordersList.isVisible().catch(() => false);

    if (hasOrders) {
      const firstOrder = ordersList.locator('li').first();

      // Should display service type
      await expect(firstOrder.locator('text=/ISBN|Cover Design|Editing|Marketing|Publishing/i')).toBeVisible();

      // Should display status badge
      await expect(firstOrder.locator('.rounded-full')).toBeVisible();

      // Should display date
      await expect(firstOrder.locator('text=/[A-Z][a-z]{2} \\d{1,2}, \\d{4}/i')).toBeVisible();
    }
  });

  test('AC 8.13.3: User can navigate to order detail view', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/orders');

    // If there are orders, click on one to navigate to detail
    const ordersList = page.locator('ul[role="list"]');
    const hasOrders = await ordersList.isVisible().catch(() => false);

    if (hasOrders) {
      const firstOrder = ordersList.locator('[role="link"]').first();
      await firstOrder.click();

      // Should navigate to detail page
      await expect(page).toHaveURL(/\/dashboard\/orders\/[a-f0-9-]+/);

      // Should see back link
      await expect(page.getByRole('link', { name: /back to orders/i })).toBeVisible();

      // Should see order details
      await expect(page.getByText(/Service/i)).toBeVisible();
      await expect(page.getByText(/Order Date/i)).toBeVisible();
    }
  });

  test('AC 8.13.3: Pending orders show cancel button', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/orders');

    // Navigate to a pending order if available
    const pendingBadge = page.locator('text=Pending');
    const hasPending = await pendingBadge.first().isVisible().catch(() => false);

    if (hasPending) {
      // Click the row containing the pending badge
      const pendingOrder = pendingBadge
        .first()
        .locator('xpath=ancestor::*[@role="link"][1]');
      await pendingOrder.click();

      // Should see cancel button on pending order
      await expect(page.getByRole('button', { name: /cancel request/i })).toBeVisible();
    }
  });

  test('AC 8.13.3: Completed orders do not show cancel button', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/orders');

    // Look for completed orders
    const completedBadge = page.locator('text=Completed');
    const hasCompleted = await completedBadge.first().isVisible().catch(() => false);

    if (hasCompleted) {
      // Click the row containing the completed badge
      const completedOrder = completedBadge
        .first()
        .locator('xpath=ancestor::*[@role="link"][1]');
      await completedOrder.click();

      // Should NOT see cancel button on completed order
      await expect(page.getByRole('button', { name: /cancel request/i })).not.toBeVisible();
    }
  });
});
