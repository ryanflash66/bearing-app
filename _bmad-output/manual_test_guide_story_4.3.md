# Manual Testing Guide: Story 4.3 (Support Messaging)

This guide validates the Support Ticket system, including the critical fixes for **Notifications** and **Audit Logging**.

## Prerequisites
1.  **User Account**: A standard user (e.g., `user@example.com`).
2.  **Support/Admin Account**: An admin user (e.g., `admin@example.com`).
3.  **Database Access (Optional but recommended)**: To verify audit logs.

---

## Scenario 1: Create a Support Ticket (User)
**Goal**: Verify a user can create a ticket and it is logged correctly.

1.  **Login** as **User**.
2.  Navigate to **/dashboard/support**.
3.  Click **"Contact Support"** (or "New Ticket").
4.  Fill out the form:
    *   **Subject**: "Login Issue [Test]"
    *   **Message**: "I cannot log in to my other account."
    *   **Priority/Category**: (If available, select any).
5.  Click **Submit**.
6.  **Expected Result**:
    *   Redirected to the Ticket Detail page (e.g., `/dashboard/support/[uuid]`).
    *   Status should be **Open**.
    *   *(Admin Check)*: Check `audit_logs` table. A `support_ticket_created` event should exist for this user.

## Scenario 2: Admin Reply & Notification (Critical Fix)
**Goal**: Verify Admin reply triggers an in-app notification for the user.

1.  **Login** as **Support Admin** (incognito window recommended).
2.  Navigate to **/dashboard/admin/support** (or `/dashboard/support` if unified).
3.  Click on the "Login Issue [Test]" ticket.
4.  **Verify**: You see the user's message.
5.  **Action**: Type a reply: "Please try resetting your password." and clickable **Send Reply**.
6.  **Expected Result**:
    *   Reply appears in the thread.
    *   Ticket Status changes to **Pending User**.
    *   *(DB Check)*: Check `audit_logs`. A `support_reply_sent` event should exist for the Admin.
7.  **Switch to User Window**:
    *   Refresh the page (or check Notification bell if implemented in header).
    *   *(DB Check)*: Check `notifications` table. A row should exist for the User ID with type `support_reply`.

## Scenario 3: User Reply
**Goal**: Verify User reply updates status for Admin.

1.  **Login** as **User**.
2.  On the ticket page, reply: "That worked, thanks."
3.  **Expected Result**:
    *   Reply appears.
    *   Ticket Status changes to **Pending Support** (or Open).
    *   *(DB Check)*: `audit_logs` should have a `support_reply_sent` event for the User.

## Scenario 4: Resolving the Ticket
**Goal**: Verify state transition to Resolved.

1.  **As User** (or Admin): Click **"Mark as Resolved"** (or close button).
2.  **Expected Result**:
    *   Status updates to **Resolved**.
    *   Reply form might be disabled (depending on logic).

---

## Database Verification Queries
Run these in the Supabase SQL Editor to confirm back-end fixes:

```sql
-- Check Audit Logs for the ticket interactions
select action, entity_type, created_at, metadata 
from audit_logs 
order by created_at desc 
limit 5;

-- Check Notifications generated
select type, title, is_read, created_at 
from notifications 
order by created_at desc 
limit 5;
```
