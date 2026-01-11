# Story 4.6: Critical Notification System

## Description

As an Operations Lead, I want automated email triggers for ticket activity, so that neither users nor agents have to manic-refresh the page to know there's an update. This connects the internal ticket state machine to the external world via reliable transactional email.

## Acceptance Criteria (Gherkin Format)

### AC 4.6.1: New Ticket Alert (to Support)

- **Given:** A new ticket is created by a user
- **When:** Successfully committed to DB
- **Then:** An email is sent to the defined Support Team alias (e.g., support@bearing.app) with ticket details

### AC 4.6.2: Reply Alert (to User)

- **Given:** An agent replies to a ticket
- **When:** The reply is logged
- **Then:** An email is sent to the User's registered address
- **And:** The email contains a link directly to the Ticket Detail page
- **And:** It does NOT necessarily contain the full message content if privacy is paramount (forcing them to log in), but a snippet is better UX. *Decision: Include snippet.*

### AC 4.6.3: Reliability

- **Given:** An email provider error
- **When:** Sending fails
- **Then:** The system logs the failure
- **And:** (Optional/Nice-to-have) A retry job enables eventual delivery

## Dependencies

- **Story 1.1:** Auth (Email functionality exists)
- **Story 4.2:** Ticket Engine (Triggers)

## Implementation Tasks (for Dev Agent)

- [x] Integrate Email Provider (Resend/SendGrid) for transactional ticket emails.
- [x] Create Email Templates: "New Ticket Received", "New Reply on Ticket #X".
- [x] Hook email sending into the Server Actions defined in Story 4.2.
- [x] Ensure sending is non-blocking (fire and forget, or background job).
- [x] Add unit tests for email module (AC 4.6.3 reliability).

## File List

| File | Action |
|------|--------|
| `src/lib/email.ts` | MODIFIED - Added notification functions |
| `src/app/api/support/tickets/route.ts` | MODIFIED - Added email hook |
| `src/app/api/support/tickets/[id]/reply/route.ts` | MODIFIED - Added email hooks |
| `tests/lib/email.test.ts` | NEW - Unit tests for email module |

## Cost Estimate

- **Storage:** None
- **Compute:** External API calls
- **Total:** Email provider costs

## Latency SLA

- **P95 target:** <500ms API handoff
- **Rationale:** Don't block the user UI for email sending

## Success Criteria (QA Gate)

- [ ] Support alias receives emails
- [ ] User receives emails on reply
- [ ] Links in emails work

## Status

**Done** – Code review passed 2026-01-05

---

## Senior Developer Review (AI)

**Reviewer:** Antigravity (Code Review Workflow)  
**Date:** 2026-01-05

### Findings

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| H1 | HIGH | XSS vulnerability – user content in HTML | ✅ Added `escapeHtml()` utility |
| H2 | HIGH | Missing return values from notification functions | ✅ Functions now return `sendEmail()` result |
| H3 | HIGH | Silent error swallowing | ✅ Added explicit error logging per function |
| M1 | MEDIUM | Test URL assertion incorrect | ✅ Verified correct |
| M2 | MEDIUM | No retry mechanism | ⏳ Deferred (AC 4.6.3 marks as optional) |
| L1 | LOW | Missing Status field | ✅ Added |

### Files Modified in Review

- `src/lib/email.ts` – XSS fix, return values, error logging
- `docs/story4.6.md` – Added Status and Review section

