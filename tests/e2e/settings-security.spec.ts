
import { test, expect } from './fixtures/auth.fixture';

/**
 * Story 8.5: Move 2FA to Settings
 * This spec verifies that 2FA management is available in the Settings page
 * and interacts correctly with the Supabase Auth MFA API.
 */
test.describe('Settings - Security & 2FA (Story 8.5)', () => {
  
  test('should display 2FA setup in Settings > Security', async ({ authenticatedPage }) => {
    // 1. Navigate to Settings
    await authenticatedPage.goto('/dashboard/settings');

    // 2. Verify Security section is visible
    const securityHeading = authenticatedPage.getByRole('heading', { name: 'Security' });
    await expect(securityHeading).toBeVisible();

    // 3. Verify 2FA enrollment UI is present (assuming the test user is NOT enrolled)
    const mfaDescription = authenticatedPage.getByText(/Add an extra layer of security/i);
    await expect(mfaDescription).toBeVisible();

    const enrollButton = authenticatedPage.getByRole('button', { name: /Enable 2FA|Set up 2FA/i });
    // Note: The actual button text might be inside MFAEnrollment component
    // If it's not visible initially, we might need to wait for loading state to finish
    await expect(authenticatedPage.getByText(/Loading security settings/i)).not.toBeVisible();
    
    // We expect at least the component to be rendered
    await expect(authenticatedPage.locator('text=Two-Factor Authentication')).toBeVisible();
  });

  test('should trigger MFA enrollment when clicking enable', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/settings');
    await expect(authenticatedPage.getByText(/Loading security settings/i)).not.toBeVisible();

    // Intercept the Supabase MFA enrollment call
    // Supabase MFA API path: **/auth/v1/mfa/enroll
    const enrollPromise = authenticatedPage.waitForResponse(resp => 
      resp.url().includes('/auth/v1/mfa/enroll') && resp.request().method() === 'POST'
    );

    // Click the "Enable" button inside the MFAEnrollment component
    // We use a flexible locator since the exact text might vary
    const enrollButton = authenticatedPage.getByRole('button', { name: /Enable|Set up/i }).first();
    await enrollButton.click();

    // Verify the API was called
    const response = await enrollPromise;
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('type', 'totp');
    
    // Verify UI updates to show QR code or next step
    await expect(authenticatedPage.getByText(/Scan the QR code/i)).toBeVisible();
  });

  test('should not show 2FA card on the main dashboard', async ({ authenticatedPage }) => {
    // Verified via E2E to be double sure
    await authenticatedPage.goto('/dashboard');
    
    // The "Enable two-factor authentication" text should NOT be present
    const mfaCard = authenticatedPage.getByText(/Enable two-factor authentication/i);
    await expect(mfaCard).not.toBeVisible();
  });
});
