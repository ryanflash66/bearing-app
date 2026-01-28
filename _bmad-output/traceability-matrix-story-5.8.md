# Traceability Matrix: Story 5.8 - Mobile Responsive Layout

> **Single Source of Truth** - This is the canonical traceability matrix for Story 5.8.

**Date:** 2026-01-22 (Updated: 2026-01-26)
**Story:** Story 5.8 (Mobile Responsive Layout)

| AC ID | Description | Test ID | Test File | Coverage Status | Notes |
|---|---|---|---|---|---|
| AC-5.8-1 | Dashboard Manuscript Grid collapses to 1 column on mobile (<768px). | 5.8-E2E-001 | tests/e2e/mobile-responsive.spec.ts | ✅ Passed | |
| AC-5.8-2 | Sidebar navigation collapses into a "Hamburger" or Bottom Sheet menu. | 5.8-E2E-002 | tests/e2e/mobile-responsive.spec.ts | ✅ Passed | |
| AC-5.8-3 | "Binder" sidebar is hidden by default on mobile; accessible via toggle. | 5.8-E2E-003 | tests/e2e/mobile-responsive.spec.ts | ✅ Passed (Manual Verification) | Verified manually per gate-decision-story-5.8.md; auto-test flaky in CI |
| AC-5.8-4 | Editor Toolbar collapses or scrolls horizontally. | 5.8-E2E-004 | tests/e2e/mobile-responsive.spec.ts | ✅ Passed | |
| AC-5.8-5 | Text container has appropriate padding (no wasted whitespace) on small screens. | 5.8-COMP-001 | tests/components/manuscripts/ManuscriptEditorResponsive.test.tsx | ✅ Passed | |
| AC-5.8-6 | "Zen Mode" (Distraction Free) works perfectly on mobile (fills screen). | N/A | N/A | ⚠️ Waived (Feature removed in Story 8.3) | |
| AC-5.8-7 | Modals (Export, Settings) fit within mobile viewports. | 5.8-E2E-006 | tests/e2e/mobile-responsive.spec.ts | ✅ Passed | |
| AC-5.8-7 | Modals (Export, Settings) fit within mobile viewports. | 5.8-COMP-002 | tests/components/manuscripts/ModalsMobileViewport.test.tsx | ✅ Passed | |

## Coverage Summary
- **Total ACs:** 7
- **Passed:** 6 (including 1 manual verification)
- **Failed:** 0
- **Waived:** 1 (Zen Mode removed in Story 8.3)
- **Coverage:** 100% (of active ACs)

## Notes
- Feature "Zen Mode" was removed in a later story (8.3), so AC-5.8-6 is waived for this story validation.
- AC-5.8-3 (Binder sidebar): Verified manually per gate-decision-story-5.8.md. The E2E test showed flakiness in CI (animation timing), but functionality is confirmed present and working.
