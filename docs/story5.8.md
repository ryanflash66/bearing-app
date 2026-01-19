# Story 5.8: Mobile Responsive Layout

Status: ready-for-dev

<!-- Note: Synthesized requirements for deferred Story 5.8 -->

## Story

As an Author,
I want to access the writing studio on my phone/tablet,
So that I can write or check my manuscript on the go.

## Acceptance Criteria

### 1. Dashboard Responsiveness
- [ ] Dashboard Manuscript Grid collapses to 1 column on mobile (<640px).
- [ ] Sidebar navigation collapses into a "Hamburger" or Bottom Sheet menu.

### 2. Editor Responsiveness
- [ ] "Binder" sidebar is hidden by default on mobile; accessible via toggle.
- [ ] Editor Toolbar collapses or scrolls horizontally.
- [ ] Text container has appropriate padding (no wasted whitespace) on small screens.
- [ ] "Zen Mode" (Distraction Free) works perfectly on mobile (fills screen).

### 3. Components
- [ ] Modals (Export, Settings) fit within mobile viewports (no off-screen buttons).

## Tasks / Subtasks

- [ ] 1. Layout Adjustments
  - [ ] Update `DashboardLayout` for mobile-first Tailwind classes.
  - [ ] Implement `MobileNav` component (Sheet/Drawer).

- [ ] 2. Editor Mobile Tweaks
  - [ ] Update `EditorLayout` to handle sidebar visibility state on mobile.
  - [ ] Fix Prose mirror editor constraints for width.

- [ ] 3. QA Polish
  - [ ] Verify Tap targets area size (44px+).

## Dev Notes

### Approach
- Start with `Dashboard`, then `Editor`.
- Use `shadcn/ui` Sheet component for mobile menus if not already present.

### References
- [PRD 11 UX](docs/PRD.md#11-ux-ui-requirements) -> "Mobile-friendly layout"

## Dev Agent Record

### Agent Model Used
Antigravity

### Debug Log References
-

### Completion Notes List
-

### File List
-
