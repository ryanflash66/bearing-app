
import { test, expect } from '../fixtures/auth.fixture';
import AxeBuilder from '@axe-core/playwright';

/**
 * AC 4.3.5: Accessibility Audit (WCAG 2.1 AA)
 * Uses axe-core to check for Critical and Serious accessibility violations.
 * Per Code Review C1.
 */
test.describe('Support Console - Accessibility (AC 4.3.5)', () => {
  test('should have no critical or serious accessibility violations on Create Ticket page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/support/create');

    const accessibilityScanResults = await new AxeBuilder({ page: authenticatedPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Filter for Critical and Serious violations only
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    // Log violations for debugging
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

  test('should have no critical or serious accessibility violations on Ticket List page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/support');

    const accessibilityScanResults = await new AxeBuilder({ page: authenticatedPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });
});
