import { test, expect } from '@playwright/test';

// This spec manipulates global state (singleton super admin + maintenance mode).
// Run serially to avoid cross-test interference.
test.describe.configure({ timeout: 120_000, mode: 'serial' });

function getE2eSecret(): string {
  const secret = process.env.E2E_INTERNAL_SECRET;
  if (!secret) {
    throw new Error('Missing E2E_INTERNAL_SECRET. Add it to your local .env/.env.local to enable E2E helpers.');
  }
  return secret;
}

function getSuperAdminCredentials(): { email: string; password: string } {
  const email = process.env.TEST_SUPER_ADMIN_EMAIL || process.env.TEST_EMAIL;
  const password = process.env.TEST_SUPER_ADMIN_PASSWORD || process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Missing TEST_EMAIL/TEST_PASSWORD (or TEST_SUPER_ADMIN_EMAIL/TEST_SUPER_ADMIN_PASSWORD). ' +
        'Set them in your local .env/.env.local for Playwright E2E.',
    );
  }
  return { email, password };
}

async function login(page: import('@playwright/test').Page, opts?: { returnUrl?: string }) {
  const { email, password } = getSuperAdminCredentials();
  const loginUrl = opts?.returnUrl ? `/login?returnUrl=${encodeURIComponent(opts.returnUrl)}` : '/login';

  await page.goto(loginUrl);
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();

  await page.fill('#email', email);
  await page.fill('#password', password);

  await Promise.all([
    page.waitForURL(/\/dashboard(\/|$)/, { timeout: 90_000, waitUntil: 'domcontentloaded' }),
    page.click('button[type="submit"]'),
  ]);
}

async function setRole(page: import('@playwright/test').Page, role: 'super_admin' | 'user') {
  const requestBody = { role };
  const resp = await page.request.post('/api/internal/e2e/set-role', {
    data: requestBody,
    headers: { 'x-e2e-internal-secret': getE2eSecret() },
  });

  const payload = (await resp.json().catch(() => null)) as
    | { ok: true; role: string; swappedFrom?: string | null; currentSuperAdminAuthId?: string | null }
    | { ok: false; error: string }
    | null;

  if (!resp.ok() || !payload || payload.ok !== true) {
    throw new Error(
      `Failed to set role via /api/internal/e2e/set-role (status ${resp.status()}). ` +
        `Request: ${JSON.stringify(requestBody)} Response: ${JSON.stringify(payload)}`,
    );
  }

  if (payload.role !== role) {
    throw new Error(`Role set mismatch: expected "${role}", got "${payload.role}". Response: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function restoreRole(page: import('@playwright/test').Page, swappedFrom?: string | null) {
  const requestBody = { role: 'user' as const, restoreSuperAdminAuthId: swappedFrom || undefined };
  const resp = await page.request.post('/api/internal/e2e/set-role', {
    data: requestBody,
    headers: { 'x-e2e-internal-secret': getE2eSecret() },
  });

  const payload = (await resp.json().catch(() => null)) as
    | { ok: true; role?: string; currentSuperAdminAuthId?: string | null; restored?: string }
    | { ok: false; error: string }
    | null;
  if (!resp.ok() || !payload || payload.ok !== true) {
    throw new Error(
      `Failed to restore roles via /api/internal/e2e/set-role (status ${resp.status()}). ` +
        `Request: ${JSON.stringify(requestBody)} Response: ${JSON.stringify(payload)}`,
    );
  }

  if (payload.role && payload.role !== 'user') {
    throw new Error(`Role restore mismatch: expected "user", got "${payload.role}". Response: ${JSON.stringify(payload)}`);
  }

  if (swappedFrom && payload.currentSuperAdminAuthId && payload.currentSuperAdminAuthId !== swappedFrom) {
    throw new Error(
      `Singleton super_admin restore mismatch: expected "${swappedFrom}", got "${payload.currentSuperAdminAuthId}". ` +
        `Response: ${JSON.stringify(payload)}`,
    );
  }
}

async function signOut(page: import('@playwright/test').Page) {
  await Promise.all([page.waitForURL(/\/login(\/|$)/), page.getByRole('button', { name: 'Sign out' }).click()]);
}

test.describe('Story 8.4 - Admin Login / Maintenance Gating', () => {
  test('login with returnUrl lands on super admin dashboard (AC 8.4.3)', async ({ page }) => {
    // First login to establish session, then promote to super_admin for E2E-only flow
    await login(page);
    const { swappedFrom } = await setRole(page, 'super_admin');
    await signOut(page);

    // Now verify post-login redirect respects returnUrl for a super_admin user
    try {
      await login(page, { returnUrl: '/dashboard/admin/super' });

      // Ensure we actually land on the intended admin route (not a generic dashboard)
      await expect(page).toHaveURL(/\/dashboard\/admin\/super(\/|$)/);
      await expect(page.getByRole('heading', { name: 'Super Admin Dashboard' })).toBeVisible();

      // Regression guard: should not be blocked by middleware maintenance message
      await expect(page.getByText('System is under maintenance. Please try again later.')).toHaveCount(0);
    } finally {
      await restoreRole(page, swappedFrom || null);
    }
  });

  test('maintenance enabled does not block super admin routes (AC 8.4.2, 8.4.4)', async ({ page }) => {
    await login(page);
    const { swappedFrom } = await setRole(page, 'super_admin');

    try {
      await page.goto('/dashboard/admin/super');
      await expect(page.getByRole('heading', { name: 'Super Admin Dashboard' })).toBeVisible();

      // Toggle maintenance ON via UI (Story 8.4 context).
      page.once('dialog', (dialog) => dialog.accept());
      const maintenanceToggle = page
        .locator('div', { has: page.getByRole('heading', { name: 'Maintenance Mode' }) })
        .getByRole('switch');
      await expect(maintenanceToggle).toBeVisible();

      const initialChecked = await maintenanceToggle.getAttribute('aria-checked');
      const initiallyEnabled = initialChecked === 'true';

      if (!initiallyEnabled) {
        await maintenanceToggle.click();
        await expect(maintenanceToggle).toHaveAttribute('aria-checked', 'true');
      }

      await expect(page.getByText('Maintenance Mode Active')).toBeVisible();

      // Navigate to another protected super admin route while maintenance is ON
      await page.goto('/dashboard/admin/super/users');
      await expect(page.getByRole('heading', { name: 'Global User Management' })).toBeVisible();

      // Regression guard: maintenance must not block admin routes with 503
      await expect(page.getByText('System is under maintenance. Please try again later.')).toHaveCount(0);

      // Cleanup: toggle maintenance OFF if we turned it on
      await page.goto('/dashboard/admin/super');
      await expect(page.getByRole('heading', { name: 'Super Admin Dashboard' })).toBeVisible();

      if (!initiallyEnabled) {
        page.once('dialog', (dialog) => dialog.accept());
        const toggleNow = page.getByRole('switch');
        await toggleNow.click();
        await expect(toggleNow).toHaveAttribute('aria-checked', 'false');
        await expect(page.getByText('Maintenance Mode Active')).toHaveCount(0);
      }
    } finally {
      await restoreRole(page, swappedFrom || null);
    }
  });
});

