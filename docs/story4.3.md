# Story 4.3: User Support Console (Frontend)

## Description

As a User, I want a persistent "My Tickets" page with accessible inputs, so that I can track my requests and type comfortably without UI bugs. This provides the author-facing interface for the support system, ensuring accessibility and ease of use.

## Acceptance Criteria (Gherkin Format)

### AC 4.3.1: Accessible Inputs

- **Given:** The support page form (New Ticket or Reply)
- **When:** Interacting with inputs
- **Then:** They use standard browser focus/cursor behaviors (No invisible text bugs, correct contrast)
- **And:** Screen readers can announce labels correctly

### AC 4.3.2: Ticket History List

- **Given:** A user with past tickets
- **When:** They visit the main support index
- **Then:** A list of tickets is displayed with Status (Badge), Subject, and Last Update time
- **And:** Clicking a list item navigates to the Detail View

### AC 4.3.3: Ticket Detail View

- **Given:** A valid ticket ID
- **When:** The Detail View loads
- **Then:** The full conversation history is shown chronologically
- **And:** A reply box is available at the bottom (if not permanently locked/archived)

### AC 4.3.4: Mobile Safari Compatibility

- **Given:** A mobile device (specifically Safari iOS context)
- **When:** Typing in the support box or viewing the list
- **Then:** The UI respects the virtual keyboard, inputs are visible, and no layout shifts break usability

### AC 4.3.5: Accessibility Audit (WCAG 2.1 AA)

- **Given:** An automated audit (e.g., axe-core checks)
- **When:** Run on the support pages
- **Then:** No "Critical" or "Serious" violations are reported

## Dependencies

- **Story 4.2:** Support Ticket Engine (API endpoints)

## Implementation Tasks (for Dev Agent)

- [ ] Build Page: `/support` (Ticket List)
- [ ] Build Page: `/support/new` (Create Ticket Form)
- [ ] Build Page: `/support/[id]` (Ticket Detail & Reply)
- [ ] Implement UI Components: StatusBadges, MessageBubbles.
- [ ] Integrate with Story 4.2 Server Actions.
- [ ] Verify Mobile Safari layout (manual check or viewport meta optimizations).
- [ ] Run Accessibility Check (Lighthouse/Axe) and fix issues.

## Cost Estimate

- **Storage:** None (Frontend)
- **Compute:** Client rendering
- **Total:** Dependencies only

## Latency SLA

- **P95 target:** <500ms First Contentful Paint
- **Rationale:** Standard UI responsiveness

## Success Criteria (QA Gate)

- [ ] New ticket flow works
- [ ] Reply flow works
- [ ] Mobile typing is visible and bug-free
- [ ] Accessibility score > 90