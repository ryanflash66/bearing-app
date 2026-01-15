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
- [ ] Create `AdminFulfillment` page
- [ ] Implement `FulfillmentQueue` component
- [ ] Create `ISBNAssignmentModal`
- [ ] Implement RPC `admin_fulfill_request`
- [ ] Add email notification trigger on fulfillment

## Status
**Ready for Dev**
