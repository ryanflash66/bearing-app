# Story 5.8: Mobile Responsive Layout

Status: done

<!-- Note: Synthesized requirements for deferred Story 5.8 -->

## Story

As an Author,
I want to access the writing studio on my phone/tablet,
So that I can write or check my manuscript on the go.

## Acceptance Criteria

### 1. Dashboard Responsiveness
- [x] Dashboard Manuscript Grid collapses to 1 column on mobile (<768px).
- [x] Sidebar navigation collapses into a "Hamburger" or Bottom Sheet menu.

### 2. Editor Responsiveness
- [x] "Binder" sidebar is hidden by default on mobile; accessible via toggle.
- [x] Editor Toolbar collapses or scrolls horizontally.
- [x] Text container has appropriate padding (no wasted whitespace) on small screens.
- [ ] "Zen Mode" (Distraction Free) works perfectly on mobile (fills screen). *(N/A — Zen Mode removed in Story 8.3; fullscreen view planned in Story 8.9)*

### 3. Components
- [x] Modals (Export, Settings) fit within mobile viewports (no off-screen buttons).

## Tasks / Subtasks

- [x] 1. Layout Adjustments
  - [x] Update `DashboardLayout` for mobile-first Tailwind classes (verified existing hamburger menu).
  - [x] Update `ManuscriptList` component to use responsive grid (1 col mobile, 2 tablet, 3 desktop).

- [x] 2. Editor Mobile Tweaks
  - [x] Add mobile Binder toggle button and Sheet overlay using shadcn/ui Sheet component.
  - [x] Update `ManuscriptEditor` header toolbar to scroll horizontally on mobile.
  - [x] Fix editor padding for mobile (responsive px-4/px-8, py-6/py-12).

- [x] 3. Modal Responsiveness
  - [x] Update `ExportModal` for mobile (stacked layout, proper buttons).
  - [x] Update `PublishingSettingsModal` for mobile.
  - [x] Update `BetaShareModal` for mobile.

- [x] 4. QA Polish
  - [x] Verify tap targets are ≥44px (added min-h-[44px] to buttons).

## Dev Notes

### Approach
- Start with `Dashboard`, then `Editor`.
- Use `shadcn/ui` Sheet component for mobile menus if not already present.

### References
- [PRD 11 UX](docs/PRD.md#11-ux-ui-requirements) -> "Mobile-friendly layout"

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Debug Log References
- Binder tests: PASS (tests/components/manuscripts/Binder.test.tsx)
- Pre-existing export test failures (puppeteer conflicts) - not related to story changes

### Completion Notes List
- Verified mobile Binder opens via Sheet overlay (no new Sheet component required on this branch)
- Verified ManuscriptList responsive grid layout (1-col mobile, 2-col tablet, 3-col desktop)
- Added mobile Binder toggle FAB button (visible only on mobile <md breakpoint)
- Added Sheet overlay for Binder on mobile (slides from left)
- Made header toolbar horizontally scrollable on mobile
- Updated editor padding to be responsive (px-4/px-8, py-6/py-12)
- Made footer keyboard shortcuts hidden on mobile
- Updated ExportModal with stacked mobile layout and min-touch-target buttons
- Updated PublishingSettingsModal with responsive sizing
- Updated BetaShareModal with responsive layout
- Updated Binder chapter buttons with min-h-[44px] for touch accessibility
- Verified existing DashboardLayout hamburger menu works correctly
- Post-review fixes: ensured key touch targets are ≥44px, added `scrollbar-hide` utility, cleaned `Binder` component, stabilized E2E Binder FAB click in dev (Next.js Dev Tools overlay)

### File List
- src/components/layout/DashboardLayout.tsx (MODIFIED - mobile hamburger + touch targets)
- src/components/manuscripts/ManuscriptEditor.tsx (MODIFIED - mobile Binder FAB + Sheet overlay, scrollable toolbar, responsive padding)
- src/components/manuscripts/Binder.tsx (MODIFIED - mobile header conditional + touch targets)
- src/components/manuscripts/ExportModal.tsx (MODIFIED - responsive layout)
- src/components/manuscripts/PublishingSettingsModal.tsx (MODIFIED - responsive sizing)
- src/components/manuscripts/BetaShareModal.tsx (MODIFIED - responsive layout + touch targets)
- src/app/globals.css (MODIFIED - scrollbar hide utility for mobile toolbar)
- tests/e2e/mobile-responsive.spec.ts (ADDED/MODIFIED - mobile responsive E2E coverage)
- tests/components/manuscripts/ManuscriptEditorResponsive.test.tsx (ADDED/MODIFIED - responsive padding coverage)
- tests/components/manuscripts/ModalsMobileViewport.test.tsx (ADDED/MODIFIED - modal viewport coverage)
- docs/sprint-status.yaml (MODIFIED - story status tracking)
- docs/story5.8.md (MODIFIED - story updates, notes, file list)

## Senior Developer Review (AI)

**Date:** 2026-01-25  
**Outcome:** ✅ Approved (fixes applied)

### Fixes applied during review
- Updated touch targets to meet ≥44px minimum:
  - `src/components/layout/DashboardLayout.tsx` (mobile hamburger button hitbox)
  - `src/components/manuscripts/BetaShareModal.tsx` (Copy/Revoke buttons)
- Added `.scrollbar-hide` CSS utility (`src/app/globals.css`) to match UX intent + tests.
- Removed dead/unused code in `src/components/manuscripts/Binder.tsx`.
- Made responsive padding test meaningful by coupling it to the real class used by `ManuscriptEditor` via `EDITOR_CONTENT_WRAPPER_CLASSNAME`.
- Stabilized `5.8-E2E-003` by triggering the Binder FAB click via DOM evaluation (avoids dev-only Next.js Dev Tools overlay intercepting pointer events).
