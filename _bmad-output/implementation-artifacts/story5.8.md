# Story 5.4: Mobile Responsive Layout

## Description

As an author using a tablet or mobile device, I want a responsive layout optimized for review and triage workflows. The mobile experience uses a bottom tab navigation, swipe-up overlays for the Binder and Clarity Hub, and touch-optimized interactions for accepting AI suggestions.

## Acceptance Criteria (Gherkin Format)

### AC 5.4.1

- **Given:** I am using a device with viewport width < 768px
- **When:** The app loads
- **Then:** The layout switches to mobile mode with a bottom tab bar
- **And:** The persistent sidebar is replaced with an icon-based tab bar

### AC 5.4.2

- **Given:** I am in mobile mode
- **When:** I tap the "Binder" tab icon
- **Then:** The Binder slides up as a bottom sheet overlay (60% height)
- **And:** Swiping down dismisses it

### AC 5.4.3

- **Given:** I am viewing a consistency issue on mobile
- **When:** I swipe right on the suggestion card
- **Then:** The suggestion is accepted and applied to the text
- **And:** A brief haptic feedback (if supported) confirms the action

### AC 5.4.4

- **Given:** I am on a tablet (768px - 1024px viewport)
- **When:** The app loads
- **Then:** The Binder is collapsible (not always visible)
- **And:** The Clarity Hub appears as a slide-over panel from the right

### AC 5.4.5

- **Given:** I tap on an interactive element on mobile
- **When:** The element is a button or action
- **Then:** The touch target is at least 44x44px
- **And:** The element has visible focus states for accessibility

### AC 5.4.6

- **Given:** I am in mobile mode
- **When:** I tap the "Canvas" tab
- **Then:** The editor is displayed in a distraction-free, full-screen centered layout
- **And:** The bottom tab bar remains visible for navigation

## Dependencies

- **Story 2.1:** Editor infrastructure
- **Story 3.2:** Clarity Hub
- **Story 5.3:** (optional) Voice input for mobile dictation

## Implementation Tasks

- [ ] Implement responsive breakpoint detection (useMediaQuery hook)
- [ ] Create `BottomTabBar` component for mobile navigation
- [ ] Create `BottomSheet` component for Binder/Hub overlays (Radix Dialog base)
- [ ] Implement swipe gestures for suggestion accept/reject (framer-motion)
- [ ] Ensure all touch targets are ≥44x44px (CSS custom properties)
- [ ] Test on iOS Safari and Android Chrome
- [ ] Add viewport meta tag and safe area insets

## Cost Estimate

- **AI inference:** $0
- **Storage:** $0
- **Compute:** $0
- **Total:** $0/month

## Latency SLA

- **Tab switch:** <100ms
- **Bottom sheet animation:** 60fps
- **Swipe gesture response:** <50ms

## Success Criteria (QA Gate)

- [ ] All ACs verified on iPhone Safari
- [ ] All ACs verified on Android Chrome
- [ ] All ACs verified on iPad
- [ ] Touch targets meet 44x44px minimum
- [ ] Animations are smooth (no jank)
- [ ] Accessible via VoiceOver/TalkBack

## Effort Estimate

- **Dev hours:** 24 hours
- **QA hours:** 8 hours
- **Total:** 32 hours

---

## Status

**backlog**

---

## UX Reference

See `_bmad-output/ux-design-specification.md`:
- Section: "Responsive Design Strategy" - "Production-on-Desktop, Review-on-Mobile"
- Section: "Breakpoint Definitions" - Mobile, Tablet, Desktop
- Section: "UX Consistency Patterns" - "Navigation & Sidebar Logic"
- Section: "Accessibility Strategy" - "Touch targets must be at least 44x44px"
