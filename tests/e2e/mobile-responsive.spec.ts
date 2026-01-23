/**
 * Story 5.8: Mobile Responsive Layout — E2E
 *
 * Maps to AC-5.8-1 .. AC-5.8-6 (5.8-E2E-001 .. 5.8-E2E-006).
 * Mobile viewport: 375×667 (<768px).
 *
 * Requires: TEST_EMAIL, TEST_PASSWORD in env; login must succeed and profile
 * creation must complete (app_role compatible with DB enum) so redirect to
 * /dashboard occurs. Otherwise auth fixture times out.
 */

import { test, expect } from './fixtures/auth.fixture';

const MOBILE_VIEWPORT = { width: 375, height: 667 };

async function ensureManuscriptAndOpenList(
  page: import('@playwright/test').Page
) {
  await page.goto('/dashboard/manuscripts/new');
  await page.waitForURL(/\/dashboard\/manuscripts\/[^/]+$/, { timeout: 15000 });
  await page.goto('/dashboard/manuscripts');
  await page.waitForLoadState('networkidle');
}

test.describe('Story 5.8 — Mobile Responsive Layout', () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    hasTouch: true,
    isMobile: true,
    navigationTimeout: 120000,
    actionTimeout: 60000,
  });

  // Increase timeout for mobile tests which can be slower
  test.setTimeout(120000);

  /**
   * 5.8-E2E-001: AC-5.8-1 — Dashboard manuscript grid collapses to 1 column on mobile (<768px)
   */
  test('5.8-E2E-001: Dashboard manuscript grid is single column on mobile', async ({
    authenticatedPage,
  }) => {
    await ensureManuscriptAndOpenList(authenticatedPage);

    const grid = authenticatedPage.locator('.grid').first();
    await expect(grid).toBeVisible();

    // Visual Verification: In a single-column layout, the item width should be roughly equal 
    // to the grid container width (accounting for minor sub-pixel rendering differences)
    // rather than relying on 'grid-template-columns' which can return varied computed strings.
    const firstItem = grid.locator('> div').first();
    await expect(firstItem).toBeVisible();

    const gridBox = await grid.boundingBox();
    const itemBox = await firstItem.boundingBox();

    expect(gridBox).not.toBeNull();
    expect(itemBox).not.toBeNull();

    if (gridBox && itemBox) {
      // The item should take up >90% of the grid width (allowing for potential small margins/borders)
      expect(itemBox.width).toBeGreaterThan(gridBox.width * 0.9);
    }
  });

  /**
   * 5.8-E2E-002: AC-5.8-2 — Sidebar navigation collapses into hamburger / bottom sheet
   */
  test('5.8-E2E-002: Sidebar collapses to hamburger; open/close works on mobile', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('domcontentloaded');

    const hamburger = authenticatedPage.getByRole('button', {
      name: /open navigation menu/i,
    });
    await expect(hamburger).toBeVisible();

    const sidebar = authenticatedPage.locator('aside');
    await expect(sidebar).toBeAttached();

    await hamburger.click();
    await expect(sidebar).toHaveClass(/translate-x-0/);

    const backdrop = authenticatedPage.locator('div[class*="bg-slate-900"][class*="fixed"]');
    await expect(backdrop).toBeVisible();
    await backdrop.click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  /**
   * 5.8-E2E-003: AC-5.8-3 — Binder hidden by default on mobile; accessible via toggle
   */
  test('5.8-E2E-003: Binder hidden by default; FAB opens Binder sheet on mobile', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/dashboard/manuscripts/new');
    await authenticatedPage.waitForURL(/\/dashboard\/manuscripts\/[^/]+$/, {
      timeout: 15000,
    });
    await authenticatedPage.waitForLoadState('domcontentloaded');
    await expect(authenticatedPage.locator('.tiptap')).toBeVisible({
      timeout: 10000,
    });

    // Add content to ensure Binder renders (it returns null if empty)
    await authenticatedPage.locator('.tiptap').click();
    await authenticatedPage.keyboard.type('# Chapter 1');
    // Wait for content to process
    await authenticatedPage.waitForTimeout(1000);

    const binderFAB = authenticatedPage.getByRole('button', {
      name: /open chapter navigation/i,
    }).first();
    await expect(binderFAB).toBeVisible();
    
    // Ensure stability before interaction
    await authenticatedPage.waitForTimeout(1000);

    await binderFAB.click();
    
    // Wait specifically for the sheet to animate in
    const sheet = authenticatedPage.getByRole('dialog');
    await expect(sheet).toBeVisible({ timeout: 15000 });
    
    // Verify content
    await expect(sheet.getByText('Binder', { exact: true })).toBeVisible();
  });

  /**
   * 5.8-E2E-004: AC-5.8-4 — Editor toolbar collapses or scrolls horizontally on mobile
   */
  test('5.8-E2E-004: Editor toolbar is scrollable on mobile', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/dashboard/manuscripts/new');
    await authenticatedPage.waitForURL(/\/dashboard\/manuscripts\/[^/]+$/, {
      timeout: 15000,
    });
    await authenticatedPage.waitForLoadState('domcontentloaded');
    await expect(authenticatedPage.locator('.tiptap')).toBeVisible({
      timeout: 10000,
    });

    const toolbar = authenticatedPage.locator('.overflow-x-auto.scrollbar-hide').first();
    await expect(toolbar).toBeVisible();
    const overflowX = await toolbar.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('overflow-x')
    );
    expect(overflowX).toBe('auto');
  });

  /**
   * 5.8-E2E-005: Removed - Zen Mode was removed in Story 8.3
   * Will be replaced by fullscreen view in Story 8.9
   */

  /**
   * 5.8-E2E-006: AC-5.8-7 — Modals (Export, Settings) fit within mobile viewports
   */
  test('5.8-E2E-006: Export modal fits within mobile viewport', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/dashboard/manuscripts/new');
    await authenticatedPage.waitForURL(/\/dashboard\/manuscripts\/[^/]+$/, {
      timeout: 15000,
    });
    await authenticatedPage.waitForLoadState('networkidle');
    await expect(authenticatedPage.locator('.tiptap')).toBeVisible({
      timeout: 10000,
    });

    await authenticatedPage.getByRole('button', { name: /export/i }).click();
    const modal = authenticatedPage.locator('div.fixed.inset-0.z-50').filter({
      has: authenticatedPage.getByRole('heading', { name: /export manuscript/i }),
    });
    await expect(modal).toBeVisible();

    const inner = modal.locator('.bg-white.rounded-xl').first();
    await expect(inner).toBeVisible();
    const box = await inner.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 32);
    expect(box!.height).toBeLessThanOrEqual(MOBILE_VIEWPORT.height + 32);
  });
});
