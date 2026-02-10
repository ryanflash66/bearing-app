import { test, expect } from '../fixtures/auth.fixture';
import AxeBuilder from '@axe-core/playwright';

/**
 * Story 8.19: Clarify AI tokens display
 * E2E tests for AI token usage display and breakdown
 */

test.describe('AI Tokens Display (Story 8.19)', () => {

  /**
   * AC 8.19.1: Explain AI tokens on Dashboard
   */
  test('should display AI tokens help affordance on dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Find the AI Tokens card
    const tokensCard = authenticatedPage.getByText('AI Tokens').first();
    await expect(tokensCard).toBeVisible();

    // Check for help affordance (info icon button)
    const helpButton = authenticatedPage.getByRole('button', { name: /what are ai tokens/i });
    await expect(helpButton).toBeVisible();

    // Verify keyboard accessibility
    await helpButton.focus();
    await expect(helpButton).toBeFocused();
  });

  test('should show token explanation when help affordance is triggered', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const helpButton = authenticatedPage.getByRole('button', { name: /what are ai tokens/i });
    await helpButton.click();

    // Check for explanation content
    await expect(authenticatedPage.getByText(/tokens are units of ai model usage/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/gemini consistency checks/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/llama ai suggestions/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/tokens reset each billing cycle/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/tokens used \/ monthly cap/i)).toBeVisible();
  });

  test('should clarify k notation in help popover', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const helpButton = authenticatedPage.getByRole('button', { name: /what are ai tokens/i });
    await helpButton.click();

    // Check for 'k' notation explanation
    const kNotation = authenticatedPage.locator('p').filter({ hasText: /k\b.*means thousands of tokens/i });
    await expect(kNotation).toBeVisible();
  });

  /**
   * AC 8.19.2: View per-feature usage breakdown
   */
  test('should open AI tokens details view with breakdown', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Find and click the "View details" trigger
    const viewDetailsButton = authenticatedPage.getByRole('button', { name: /view details/i });
    await viewDetailsButton.click();

    // Check that the sheet/modal opens
    await expect(authenticatedPage.getByText('AI Token Usage Details')).toBeVisible();
  });

  test('should display per-feature breakdown with tokens and counts', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const viewDetailsButton = authenticatedPage.getByRole('button', { name: /view details/i });
    await viewDetailsButton.click();

    // Wait for the sheet to be visible
    await expect(authenticatedPage.getByText('AI Token Usage Details')).toBeVisible();

    // The breakdown should show feature names (if there's usage data)
    // Note: Actual data depends on test database state
    // At minimum, check for the structure
    const breakdownSection = authenticatedPage.locator('[data-testid="feature-breakdown"]');
    await expect(breakdownSection).toBeVisible();
  });

  test('should show empty state when no usage events exist', async ({ authenticatedPage }) => {
    // This test assumes a test user with no AI usage
    // If your test fixtures create usage data, you may need to adjust
    await authenticatedPage.goto('/dashboard');

    const viewDetailsButton = authenticatedPage.getByRole('button', { name: /view details/i });
    await viewDetailsButton.click();

    // Look for either breakdown or empty state
    const detailsSheet = authenticatedPage.locator('text=AI Token Usage Details').first();
    await expect(detailsSheet).toBeVisible();

    // If there's no usage, should see empty state
    // If there is usage, should see feature names
    const hasEmptyState = await authenticatedPage.getByText('No AI usage yet this cycle.').isVisible();
    const hasBreakdown = await authenticatedPage.getByText(/Consistency Checks|AI Suggestions/i).isVisible();

    expect(hasEmptyState || hasBreakdown).toBeTruthy();
  });

  /**
   * AC 8.19.3: Clarify units and formatting
   */
  test('should display exact token numbers with locale formatting in details view', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const viewDetailsButton = authenticatedPage.getByRole('button', { name: /view details/i });
    await viewDetailsButton.click();

    await expect(authenticatedPage.getByText('AI Token Usage Details')).toBeVisible();

    // Check that the monthly cap is displayed with locale formatting
    // The component uses toLocaleString("en-US"), so this is deterministic
    // The cap is 10,000,000 from MONTHLY_TOKEN_CAP
    const monthlyCap = authenticatedPage.getByText('10,000,000');
    await expect(monthlyCap).toBeVisible();
  });

  test('should clarify k notation in dashboard summary', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // The dashboard may use abbreviated format like "5k"
    // The help should clarify that k means thousands
    const helpButton = authenticatedPage.getByRole('button', { name: /what are ai tokens/i });
    await helpButton.click();

    const kExplanation = authenticatedPage.locator('p').filter({ hasText: /k\b.*means thousands of tokens/i });
    await expect(kExplanation).toBeVisible();
  });

  /**
   * AC 8.19.4: Upgrade / purchase guidance
   */
  test('should display upgrade link in details view', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const viewDetailsButton = authenticatedPage.getByRole('button', { name: /view details/i });
    await viewDetailsButton.click();

    await expect(authenticatedPage.getByText('AI Token Usage Details')).toBeVisible();

    // Check for upgrade guidance
    await expect(authenticatedPage.getByText('Need more tokens?')).toBeVisible();
    await expect(authenticatedPage.getByText(/additional tokens are available via plan upgrade/i)).toBeVisible();

    // Verify link to settings
    const upgradeLink = authenticatedPage.getByRole('link', { name: /view upgrade options/i });
    await expect(upgradeLink).toBeVisible();
    await expect(upgradeLink).toHaveAttribute('href', '/dashboard/settings');
  });

  /**
   * AC 8.19.5: Admin usage table clarity (Super Admin)
   */
  test('should display AI token help in Super Admin user usage table', async ({ authenticatedPage }) => {
    // This test requires a Super Admin user
    // You may need to adjust the fixture or create a separate one for admin users

    // For now, we'll skip this test if not running as admin
    // In a real scenario, you'd have an admin fixture
    test.skip(!process.env.TEST_ADMIN_USER, 'Requires Super Admin account');

    await authenticatedPage.goto('/dashboard/admin/users');

    // Find the Tokens (Cycle) column header
    const tokensHeader = authenticatedPage.getByText('Tokens (Cycle)');
    await expect(tokensHeader).toBeVisible();

    // Find the help affordance in the header
    const helpButton = tokensHeader.locator('..').getByRole('button', { name: /what are ai tokens/i });
    await expect(helpButton).toBeVisible();

    // Click and verify same explanation copy
    await helpButton.click();
    await expect(authenticatedPage.getByText(/tokens are units of ai model usage/i)).toBeVisible();
  });

  /**
   * Accessibility validation
   */
  test('should have no critical accessibility violations on dashboard AI tokens card', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page: authenticatedPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalViolations.length > 0) {
      console.log('Accessibility Violations Found:', JSON.stringify(criticalViolations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map(n => n.html)
      })), null, 2));
    }

    expect(criticalViolations).toEqual([]);
  });

  test('should have no critical accessibility violations in AI tokens details sheet', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const viewDetailsButton = authenticatedPage.getByRole('button', { name: /view details/i });
    await viewDetailsButton.click();

    // Wait for sheet to be fully rendered
    await expect(authenticatedPage.getByText('AI Token Usage Details')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page: authenticatedPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });
});
