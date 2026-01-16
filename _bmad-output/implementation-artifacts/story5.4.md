# Story 5.4: Admin Fulfillment Dashboard

## Description

As an Admin, I need a dedicated dashboard to view and fulfill open service requests (e.g., assigning ISBNs manually if the pool is empty, or verifying other services) to ensure authors receive what they paid for.

## Acceptance Criteria (Gherkin Format)

### AC 5.4.1
- **Given:** I am a Super Admin
- **When:** I navigate to `/dashboard/admin/fulfillment`
- **Then:** I see a queue of "Pending" service requests sorted by oldest first

### AC 5.4.2
- **Given:** I am viewing a pending ISBN request
- **When:** I click "Fulfill"
- **Then:** I am prompted to enter/assign an ISBN (or confirm auto-assignment)
- **And:** The request status updates to "Completed"
- **And:** The author receives a notification (email/in-app)

### AC 5.4.3
- **Given:** A request cannot be fulfilled
- **When:** I click "Reject/Refund"
- **Then:** The request is marked "Cancelled"
- **And:** A refund flow is initiated (manual or Stripe integration)

## Dependencies
- **Story 5.2:** Service Requests Table
- **Story 4.1:** Admin Role

## Implementation Tasks
- [x] Create `AdminFulfillment` page
- [x] Implement `FulfillmentQueue` component
- [x] Create `ISBNAssignmentModal`
- [x] Create API endpoint `/api/admin/fulfill-request`
- [x] Add email notification trigger on fulfillment

## Dev Notes

### Architecture
- Uses the existing `service_requests` and `isbn_pool` tables from Story 5.2
- Super Admin access required (checked via `isSuperAdmin()`)
- Service role client used for admin operations to bypass RLS

### Key Patterns
- Server component (page.tsx) fetches data, client component (FulfillmentDashboard.tsx) handles interactions
- Modal pattern for ISBN assignment and rejection
- Toast/notification pattern for user feedback via both in-app notifications and email

## Dev Agent Record

### Implementation Plan
1. Created AdminFulfillment page at `/dashboard/admin/fulfillment`
2. Implemented FulfillmentQueue component with table view of pending requests
3. Created ISBNAssignmentModal with manual entry and auto-assign from pool options
4. Created RejectRequestModal with refund option via Stripe
5. Built API endpoints `/api/admin/fulfill-request` and `/api/admin/reject-request`
6. Added email notifications via Resend for fulfillment and cancellation

### Debug Log
- No issues encountered during implementation
- All TypeScript types resolved correctly
- Tests written and passing

### Completion Notes
- AC 5.4.1: Fulfillment page shows pending requests sorted by oldest first
- AC 5.4.2: ISBN assignment modal supports both manual entry and auto-assign from pool; in-app and email notifications sent on fulfillment
- AC 5.4.3: Reject modal supports cancellation with optional Stripe refund; notifications sent on cancellation

## File List

### New Files
- `src/app/dashboard/admin/fulfillment/page.tsx` - Admin fulfillment page (server component)
- `src/components/admin/FulfillmentDashboard.tsx` - Client component for interactions
- `src/components/admin/FulfillmentQueue.tsx` - Table component for pending requests
- `src/components/admin/ISBNAssignmentModal.tsx` - Modal for ISBN assignment
- `src/components/admin/RejectRequestModal.tsx` - Modal for request rejection
- `src/app/api/admin/fulfill-request/route.ts` - API endpoint for fulfillment
- `src/app/api/admin/reject-request/route.ts` - API endpoint for rejection
- `tests/components/admin/FulfillmentQueue.test.tsx` - Tests for FulfillmentQueue
- `tests/components/admin/ISBNAssignmentModal.test.tsx` - Tests for ISBNAssignmentModal
- `tests/components/admin/RejectRequestModal.test.tsx` - Tests for RejectRequestModal

### Modified Files
- `src/lib/email.ts` - Added `notifyServiceFulfilled` and `notifyServiceCancelled` functions
- `src/lib/stripe.ts` - Added `refunds` getter for Stripe refund operations
- `tests/lib/email.test.ts` - Added tests for new email notification functions

## Change Log
- 2026-01-15: Code Review Fixes (AI)
  - Added missing RejectRequestModal.test.tsx with comprehensive tests
  - Added auto-assign coverage tests to ISBNAssignmentModal.test.tsx
  - Fixed alert() UX issue - replaced with inline error banner in FulfillmentDashboard
  - Added ARIA accessibility attributes (role, aria-modal, aria-labelledby) to modals
  - Updated task description to accurately reflect REST API implementation
- 2026-01-15: Implemented Story 5.4 - Admin Fulfillment Dashboard
  - Created fulfillment page with queue of pending service requests
  - Implemented ISBN assignment modal with manual/auto-assign options
  - Added reject/refund flow with Stripe integration
  - Added email notifications for fulfillment and cancellation

## Status
**Done**
