import { test, expect } from "./fixtures/auth.fixture";
import AxeBuilder from "@axe-core/playwright";

/**
 * Story 8.9: Zen mode → Fullscreen view — NFR/Smoke E2E
 *
 * Goals:
 * - Validate core fullscreen UX works end-to-end (toggle, exit, focus).
 * - Provide a coarse regression guard for fullscreen transition time.
 * - Validate fullscreen overlay has no critical/serious a11y violations (scoped).
 *
 * Note on "performance" here:
 * This is NOT load testing. It's a coarse UI regression check only.
 */
test.describe("Story 8.9 — Fullscreen (NFR Smoke)", () => {
  async function openNewManuscriptEditor(
    authenticatedPage: import("@playwright/test").Page,
  ) {
    await authenticatedPage.goto("/dashboard/manuscripts/new");
    await authenticatedPage.waitForURL(/\/dashboard\/manuscripts\/[^/]+$/, {
      timeout: 15000,
    });
    await expect(authenticatedPage.locator(".tiptap").first()).toBeVisible({
      timeout: 15000,
    });
  }

  /**
   * 8.9-E2E-001: AC 8.9.1 + 8.9.4 — Toggle fullscreen and exit reliably (button + Esc)
   */
  test("8.9-E2E-001: can enter fullscreen quickly, keep focus, and exit (Esc)", async ({
    authenticatedPage,
  }) => {
    await openNewManuscriptEditor(authenticatedPage);

    const editor = authenticatedPage.locator(".tiptap").first();
    await editor.click();

    const fullscreenButton = authenticatedPage.locator(
      '[data-testid="fullscreen-button"]',
    );
    await expect(fullscreenButton).toBeVisible();

    const startMs = Date.now();
    // In dev, floating overlays can occasionally intercept pointer events; click via DOM.
    await fullscreenButton.evaluate((el) => (el as HTMLButtonElement).click());

    const overlay = authenticatedPage.locator(
      '[data-testid="fullscreen-overlay"]',
    );
    await expect(overlay).toBeVisible();
    const elapsedMs = Date.now() - startMs;

    // Coarse regression guard only: toggle should be effectively immediate.
    expect(elapsedMs).toBeLessThan(5000);

    // Focus should remain on the editor for uninterrupted typing (AC 8.9.1)
    await authenticatedPage.keyboard.type("Hello fullscreen");
    await expect(editor).toContainText("Hello fullscreen");

    // Exit via Escape (AC 8.9.4)
    await authenticatedPage.keyboard.press("Escape");
    await expect(overlay).not.toBeVisible();
  });

  /**
   * 8.9-E2E-002: AC 8.9.3 — Theme toggle persists to localStorage and is applied on re-entry
   */
  test("8.9-E2E-002: persists fullscreen theme preference (localStorage)", async ({
    authenticatedPage,
  }) => {
    await openNewManuscriptEditor(authenticatedPage);

    const fullscreenButton = authenticatedPage.locator(
      '[data-testid="fullscreen-button"]',
    );
    await fullscreenButton.evaluate((el) => (el as HTMLButtonElement).click());

    const overlay = authenticatedPage.locator(
      '[data-testid="fullscreen-overlay"]',
    );
    await expect(overlay).toBeVisible();

    const toggleDarkMode = authenticatedPage.getByRole("button", {
      name: /toggle dark mode/i,
    });
    await expect(toggleDarkMode).toBeVisible();
    await toggleDarkMode.click();

    await expect(overlay).toHaveClass(/bg-slate-900/);
    const stored = await authenticatedPage.evaluate(() =>
      localStorage.getItem("bearing-fullscreen-theme"),
    );
    expect(stored).toBe("dark");

    // Exit and re-enter to verify persistence is applied
    await authenticatedPage
      .getByRole("button", { name: /exit fullscreen/i })
      .click();
    await expect(overlay).not.toBeVisible();

    await fullscreenButton.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveClass(/bg-slate-900/);
  });

  /**
   * 8.9-E2E-003: AC 8.9.2 — Fullscreen overlay controls are accessible (axe)
   */
  test("8.9-E2E-003: fullscreen overlay has no critical/serious a11y violations (scoped)", async ({
    authenticatedPage,
  }) => {
    await openNewManuscriptEditor(authenticatedPage);

    const fullscreenButton = authenticatedPage.locator(
      '[data-testid="fullscreen-button"]',
    );
    await fullscreenButton.evaluate((el) => (el as HTMLButtonElement).click());

    const overlay = authenticatedPage.locator(
      '[data-testid="fullscreen-overlay"]',
    );
    await expect(overlay).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-testid="fullscreen-controls"]'),
    ).toBeVisible();

    const results = await new AxeBuilder({ page: authenticatedPage })
      .include('[data-testid="fullscreen-overlay"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    if (criticalOrSerious.length > 0) {
      console.log(
        "Fullscreen Accessibility Violations:",
        JSON.stringify(
          criticalOrSerious.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.map((n) => n.html),
          })),
          null,
          2,
        ),
      );
    }

    expect(criticalOrSerious).toEqual([]);
  });
});
