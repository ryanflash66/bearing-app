# Story 5.3: Service Request Management

## Description

As an author who has purchased a service (like an ISBN), I want to view my order history and track the status of my requests ("Pending", "In Progress", "Completed") so that I have visibility into the fulfillment process.

## Acceptance Criteria (Gherkin Format)

### AC 5.3.1
- **Given:** I am on the Dashboard
- **When:** I click the "My Orders" tab
- **Then:** I see a list of my past service requests
- **And:** Each item shows date, service type (e.g., "ISBN"), amount, and current status

### AC 5.3.2
- **Given:** I have a fulfilled ISBN request
- **When:** I view the order details
- **Then:** I can see the assigned ISBN number
- **And:** I can copy it to my clipboard

### AC 5.3.3
- **Given:** I have a pending request
- **When:** I view the order details
- **Then:** I see a "Processing" indicator with an estimated completion time

## Dependencies
- **Story 5.1:** Service Marketplace UI (Navigation)
- **Story 5.2:** Service Requests Table (Data Source)

## Implementation Tasks
- [x] Create `MyOrders` page at `/dashboard/orders`
- [x] Create `OrderList` component
- [x] Create `OrderDetail` component with status-specific views
- [x] Query service_requests table (via RLS, not RPC - consistent with codebase patterns)
- [x] Add navigation link to Sidebar/Marketplace

## Status
**done**

---

## Dev Agent Record

### Implementation Plan
- Created My Orders page at `/dashboard/orders` following existing page patterns
- Built `OrderList` component with status badges, formatted dates, and amounts
- Built `OrderDetail` component with status-specific views (Processing indicator for pending, ISBN display with copy for completed)
- Used existing RLS policy (`auth.uid() = user_id`) instead of RPC - pattern consistent with codebase
- Added "My Orders" nav item to DashboardLayout sidebar (authorOnly: true)
- Applied red-green-refactor TDD approach with Jest tests

### Debug Log
- No significant issues encountered
- Fixed test selectors for duplicate text scenarios (multiple headings, service names appearing in header and details)

### Completion Notes
All acceptance criteria verified:
- AC 5.3.1: Order list displays date, service type, amount, status with navigation to details
- AC 5.3.2: Completed ISBN orders show ISBN with functional copy-to-clipboard button
- AC 5.3.3: Pending orders show "Processing" indicator with estimated completion time

Tests: 20 tests passing for OrdersPage, OrderList, OrderDetail components
Build: Successful compilation with new routes registered

---

## File List

### New Files
- `src/app/dashboard/orders/page.tsx` - My Orders page with error state UI
- `src/app/dashboard/orders/[id]/page.tsx` - Order detail page
- `src/components/marketplace/OrderList.tsx` - Order list component
- `src/components/marketplace/OrderDetail.tsx` - Order detail component with clipboard error handling
- `src/lib/marketplace-utils.ts` - Shared types, constants, and utilities for marketplace
- `tests/components/marketplace/OrdersPage.test.tsx` - Page tests
- `tests/components/marketplace/OrderList.test.tsx` - OrderList component tests
- `tests/components/marketplace/OrderDetail.test.tsx` - OrderDetail component tests (21 tests)

### Modified Files
- `src/components/layout/DashboardLayout.tsx` - Added "My Orders" nav item
- `src/types/supabase.ts` - Regenerated with service_requests table types
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-14 | Story 5.3 implemented: My Orders page, OrderList, OrderDetail components, navigation link, tests | Dev Agent |
| 2026-01-15 | Code review fixes: extracted shared marketplace-utils.ts, added clipboard error handling, added error state UI for orders page, regenerated Supabase types, added test for clipboard error | Code Review |
