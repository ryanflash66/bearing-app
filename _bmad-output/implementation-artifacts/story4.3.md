# Story 4.3: In-App Support Messaging

## Description

As an author, I can contact support directly from the app. Messages are stored securely, admins are notified, and replies appear in-app. All communication is auditable and isolated per account.

## Acceptance Criteria (Gherkin Format)

### AC 4.3.1

- **Given:** An authenticated author
- **When:** They click "Contact Support"
- **Then:** A form appears with subject and message fields

### AC 4.3.2

- **Given:** A support message is submitted
- **When:** Submission succeeds
- **Then:** A support ticket is created and admins receive an email notification

### AC 4.3.3

- **Given:** An admin replies via email or dashboard
- **When:** The reply is sent
- **Then:** The author sees the response in-app with a notification

### AC 4.3.4

- **Given:** An author views support history
- **When:** The inbox loads
- **Then:** Messages are shown in reverse chronological order

### AC 4.3.5

- **Given:** Any support message or reply
- **When:** It is sent
- **Then:** The message is stored immutably and logged for audit/compliance

## Dependencies

- **Story 1.1:** Authentication
- **Infrastructure requirement:** Email delivery service (SendGrid or Supabase)
- **Infrastructure requirement:** `support_tickets` and `support_messages` tables

## Implementation Tasks (for Dev Agent)

- [ ] Implement support ticket creation API
- [ ] Build author support UI
- [ ] Implement admin reply UI and email integration
- [ ] Store messages in `support_messages` table
- [ ] Add notifications (email + in-app)
- [ ] Log support actions to `audit_logs`
- [ ] Write end-to-end messaging tests

## Cost Estimate

- **AI inference:** 0 tokens
- **Storage:** ~$0.10/month
- **Compute:** ~$0
- **Total:** $0/month at 10 authors, $0 at 100

## Latency SLA

- **P95 target:** <500ms for message submit
- **Rationale:** Messaging should feel instant

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Messages delivered reliably
- [ ] Admin replies visible to authors
- [ ] Audit logs complete
- [ ] No cross-account access

## Effort Estimate

- **Dev hours:** 8 hours
- **QA hours:** 4 hours
- **Total:** 12 hours