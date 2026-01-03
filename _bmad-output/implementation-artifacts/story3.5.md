# Story 3.5: Consistency Badges in Binder

## Description

As an author, I can see visual "Consistency Badges" (🔴/🟡) next to chapters in the Binder sidebar that have unresolved narrative issues. These badges provide immediate feedback on manuscript health without requiring me to open the Clarity Hub.

## Acceptance Criteria (Gherkin Format)

### AC 3.5.1

- **Given:** A consistency check has completed (Story 3.1)
- **When:** Issues are found in specific chapters
- **Then:** The affected chapters in the Binder show a badge icon next to their title
- **And:** Critical issues show 🔴, warnings show 🟡

### AC 3.5.2

- **Given:** A chapter has a consistency badge
- **When:** I click the badge
- **Then:** The Clarity Hub slides open (or scrolls) to show the issues for that chapter
- **And:** The Canvas auto-scrolls to the first issue's location

### AC 3.5.3

- **Given:** I have resolved an issue in the Clarity Hub
- **When:** The fix is applied
- **Then:** The corresponding badge is updated or removed in real-time
- **And:** No page refresh is required

### AC 3.5.4

- **Given:** A chapter has multiple issues of different severities
- **When:** The badge is displayed
- **Then:** The highest severity badge is shown (🔴 > 🟡)
- **And:** A count indicator shows the total number of issues (e.g., "🔴 3")

### AC 3.5.5

- **Given:** No consistency check has been run yet
- **When:** I view the Binder
- **Then:** No badges are shown (neutral state, not "all clear")
- **And:** A subtle prompt suggests running a check

## Dependencies

- **Story 3.1:** Consistency check infrastructure
- **Story 3.2:** Structured consistency reports with chapter locations
- **Story 2.1:** Binder/sidebar component

## Implementation Tasks

- [x] Extend Binder component to accept issue counts per chapter
- [x] Create `ConsistencyBadge` component with severity-based styling
- [x] Subscribe to consistency report updates (Supabase Realtime or React Query)
- [x] Implement badge-click navigation to Clarity Hub + Canvas scroll
- [x] Add real-time badge updates when issues are resolved
- [x] Style badges according to "Modern Parchment" design tokens

## Cost Estimate

- **AI inference:** $0 (uses existing consistency data)
- **Storage:** Negligible
- **Compute:** ~$0
- **Total:** $0/month

## Latency SLA

- **Badge update:** <100ms after issue resolution
- **Click-to-navigate:** <200ms

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Badges appear after consistency check
- [ ] Click navigation works correctly
- [ ] Real-time updates function
- [ ] Accessible (badges have ARIA labels)

## Effort Estimate

- **Dev hours:** 12 hours
- **QA hours:** 4 hours
- **Total:** 16 hours

---

## Status

**done**

---

## UX Reference

See `_bmad-output/ux-design-specification.md`:
- Section: "Detailed Core Experience" - "User Mental Model" - "Consistency Badges (🔴)"
- Section: "Novel UX Patterns" - "Consistency Badges"
- Section: "Component: The Multi-Modal Binder"
