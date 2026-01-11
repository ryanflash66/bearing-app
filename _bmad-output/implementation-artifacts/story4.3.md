# Story 4.3: In-App Support Inbox

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an author, 
I want to chat with support directly inside the dashboard, 
So that I don't have to check my email for updates.

## Acceptance Criteria

1.  **Ticket Creation:** Authors can access a "Help" or "Support" section and create a new ticket with a Subject and Initial Message.
2.  **Secure Chat Interface:** Clicking a ticket opens a dedicated chat view that displays the full message history (User and Support/Admin messages), limited to the last 50 messages for performance.
3.  **Real-Time Updates (Chat):** New messages from Support Agents appear instantly without refreshing the page (via Supabase Realtime).
4.  **Real-Time Updates (List):** The Ticket List view instantly updates status badges (e.g., from 'open' to 'pending_user') when an agent replies.
5.  **RPC Enforcement:** All creation and message sending actions MUST use RPCs (`create_ticket`, `reply_to_ticket`) to ensure strict state transitions and timestamp updates.
6.  **Mobile Responsiveness:** The chat layout adapts perfectly to mobile devices, likely using a full-screen or overlay pattern to maximize reading space, adhering to the "Production-on-Desktop, Review-on-Mobile" philosophy.

## Tasks / Subtasks

- [ ] **Task 1: Support UI Components (Shadcn/UI)** (AC: 1, 2, 4)
  - [ ] Create `src/app/dashboard/support/page.tsx` (Ticket List) and `src/app/dashboard/support/[id]/page.tsx` (Chat View).
  - [ ] Implement `TicketList` component showing status badges.
  - [ ] **Enhancement:** Subscribe to `support_tickets` changes in `TicketList` to live-update statuses.
  - [ ] Implement `ChatInterface` using "Modern Parchment" styling (Merriweather/Inter).
  - [ ] **Constraint:** Ensure strictly no "Support" role data leaks; Authors only see their own tickets.

- [ ] **Task 2: Ticket Creation RPC & Logic** (AC: 1, 5)
  - [ ] **Critical:** Create `create_ticket` RPC in `src/lib/rpc/` (or DB migration):
    -   Input: `subject` (text), `message` (text).
    -   Logic: Insert into `support_tickets` (default status 'open') -> Insert initial `support_message` -> Return `ticket_id`.
    -   Security: `auth.uid()` matching.
  - [ ] Implement frontend form to call `create_ticket`.
  - [ ] Validate non-empty subject and message.
  - [ ] Redirect to chat view upon success.

- [ ] **Task 3: Real-Time Chat Implementation** (AC: 2, 3, 5)
  - [ ] Fetch messages using `useQuery` against `support_messages` view with `.order('created_at', { ascending: true }).limit(50)`.
  - [ ] Set up `supabase.channel` subscription for `INSERT` on `support_messages` table (filtered by `ticket_id`).
  - [ ] Implement "Send Reply" using `reply_to_ticket` RPC.
  - [ ] Optimistic UI updates recommended.

- [ ] **Task 4: Mobile Optimization** (AC: 6)
  - [ ] Verify Chat View on mobile breakpoint (< 768px).
  - [ ] Ensure input field is accessible (avoids keyboard overlay issues).
  - [ ] Implement responsive navigation (e.g., bottom tab or back button behavior).

## Dev Notes

### Architecture & Patterns
-   **RPC-First Strategy:**
    -   `create_ticket(subject, message)`: Transactional insert of ticket + first message.
    -   `reply_to_ticket(ticket_id, message)`: Handles status transition to 'pending_support' (User) or 'pending_user' (Agent).
-   **Realtime:** Use the pattern: `const channel = supabase.channel('tickets:' + ticketId)...` separate channels for List (tickets table) and Chat (messages table).
-   **Performance:** Always limit message history fetch to 50 initially. Pagination is out of scope for MVP but keep it in mind.

### UX Design Specs
-   **Theme:** "Modern Parchment" (#FDF7E9 background).
-   **Typography:** Inter for UI elements, Merriweather for long-form text.
-   **Micro-interactions:** Smooth transition when opening a ticket. Status badges should "pulse" or animate when updating via Realtime.

### Source Tree Focus
-   `src/app/dashboard/support/`
-   `src/components/support/`
-   `supabase/migrations/` (For new RPCs)

### Testing Standards
-   **Manual Test:** Open two browsers (Author vs Admin/Support).
    -   Verify Ticket List updates status when Agent replies.
    -   Verify Chat View receives messages instantly.
-   **Mobile Test:** Use DevTools mobile emulation to verify layout.

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
### Agent Model Used
Antigravity (System)
