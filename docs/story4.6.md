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

- [ ] Integrate Email Provider (Resend/SendGrid) for transactional ticket emails.
- [ ] Create Email Templates: "New Ticket Received", "New Reply on Ticket #X".
- [ ] Hook email sending into the Server Actions defined in Story 4.2.
- [ ] Ensure sending is non-blocking (fire and forget, or background job).

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
