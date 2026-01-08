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

- [x] Implement support ticket creation API
- [x] Build author support UI
- [x] Implement admin reply UI and email integration
- [x] Store messages in `support_messages` table
- [x] Add notifications (email + in-app)
- [x] Log support actions to `audit_logs`
- [x] Write end-to-end messaging tests
- Replace email mock with real integration (SendGrid/Resend) - Deferred

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

## Status

- [ ] In-Progress
- [ ] Review
- [x] Done

## Dev Notes

### Implementation Strategy
- **Database**:
  - `support_tickets`: id, user_id, subject, status (open, closed), created_at, updated_at
  - `support_messages`: id, ticket_id, sender_id (user or admin), message, created_at
  - RLS policies to ensure users see only their tickets, admins see all.
- **API**:
  - POST `/api/support/tickets`: Create ticket
  - POST `/api/support/tickets/[id]/reply`: Add message
  - GET `/api/support/tickets`: List tickets for user (or all for admin)
  - GET `/api/support/tickets/[id]`: Get ticket details and messages
- **UI**:
  - Author: `src/app/dashboard/support/`
  - Admin: `src/app/dashboard/admin/support/`
- **Notifications**:
  - Use existing email infrastructure.

## Dev Agent Record

### Implementation Notes
- Implemented full support ticketing system with database tables `support_tickets` and `support_messages`.
- Secure RLS policies ensuring isolation between users and granting full access to admins/support roles.
- Created User Dashboard UI (`/dashboard/support`) for creating, viewing, and replying to tickets.
- Created Admin Dashboard UI (`/dashboard/admin/support`) for managing tickets and updating status.
- Implemented Email Integration mock service in `src/lib/email.ts` with hooks in API routes.
- Integrated `audit_logs` for ticket creation events.
- Added comprehensive unit tests for API and Components, and an E2E test suite.
- **Review Fix (AI):** Implemented `notifications` table and updated `reply_to_ticket` RPC to generate in-app alerts.
- **Review Fix (AI):** Hardened audit logging in API routes to prevent race conditions.
- **Review Fix (AI):** Completed Missing Audit Logs for Replies.

### Debug Log
- Initial implementation of API required explicitly fetching user profile ID as it differs from Auth ID.
- Added support for Status Updates via Admin UI.
- **Migration Fix:** Repaired migration history after slight drift.

## File List
- supabase/migrations/20260103000004_create_support_tables.sql
- supabase/migrations/20260107000001_add_notifications.sql
- src/app/api/support/tickets/route.ts
- tests/api/tickets.test.ts
- src/app/dashboard/support/create/page.tsx
- src/components/support/CreateTicketForm.tsx
- tests/components/support/CreateTicketForm.test.tsx
- src/app/dashboard/support/page.tsx
- src/app/dashboard/support/[id]/page.tsx
- src/components/support/ReplyForm.tsx
- src/app/api/support/tickets/[id]/reply/route.ts
- src/lib/email.ts
- src/app/dashboard/admin/page.tsx
- src/app/dashboard/admin/support/page.tsx
- src/app/api/support/tickets/[id]/status/route.ts
- src/components/admin/TicketStatusSelect.tsx
- src/app/dashboard/admin/support/[id]/page.tsx
- src/components/admin/UserSnapshotPanel.tsx
- tests/e2e/support.spec.ts

## Change Log