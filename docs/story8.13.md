# Story 8.13: My Orders / Service tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an author,
I want to track my service requests and see their status,
so that I know when my ISBN or other services are ready.

## Acceptance Criteria

1.  **AC 8.13.1: View "My Orders" List**
    -   **Given** I am on the Dashboard
    -   **When** I navigate to `/dashboard/orders`
    -   **Then** I see a list of all my submitted service requests.
    -   **And** the list displays:
        -   **Service Type** (e.g., "Publishing", "ISBN Registration")
        -   **Manuscript Title** (if linked)
        -   **Status** (Badge)
        -   **Date Submitted**
    -   **And** the list is sorted by Date Submitted (newest first).

2.  **AC 8.13.2: Status Badges & Visuals**
    -   Requests display status badges with appropriate colors (matching DB enums):
        -   `pending` (was "submitted"): Neutral/Yellow
        -   `in_progress`: Blue
        -   `completed`: Green
        -   `cancelled`: Red
        -   `failed`: Red
        -   `paid`: Purple (Awaiting fulfillment)
    -   Empty state: "No service requests found" with a link to Marketplace.

3.  **AC 8.13.3: Order Details View**
    -   **When** I click on an order row/item
    -   **Then** it navigates to `/dashboard/orders/[id]`.
    -   **And** I see:
        -   Full Metadata (e.g., submitted form data).
        -   Current Status.
        -   Admin Notes (if visible to user).
    -   **And** I can see a "Cancel Request" button if status is `pending`.

4.  **AC 8.13.4: Email Notification on Status Change**
    -   **Given** a service request exists
    -   **When** the status is updated (e.g. by Admin via API or Dashboard)
    -   **Then** the system sends an email to the User via **Resend**.
    -   **And** the email Subject matches: "Update on your [Service Name] Request".
    -   **And** the email Body includes:
        -   Current Status.
        -   Link to `/dashboard/orders/[id]`.

5.  **AC 8.13.5: Manuscript Sync Link**
    -   If the request is linked to a manuscript:
        -   The "Manuscript" column links to the Manuscript Editor.
        -   The visual indication matches Story 8.20 sync patterns (consistent naming).

## Tasks / Subtasks

- [x] **Task 1: My Orders List Implementation**
    - [x] 1.1 Create `src/app/dashboard/orders/page.tsx` (List View).
    - [x] 1.2 Create `src/components/marketplace/OrderList.tsx` (Table/Grid).
    - [x] 1.3 Create `src/components/marketplace/OrderItem.tsx` (Row/Card).
    - [x] 1.4 Integrate `src/api/services/request` fetching (GET /api/services/request?user_id=me).
    - [x] 1.5 Ensure badges match DB Status Enum: `pending`, `paid`, `in_progress`, `completed`, `cancelled`, `failed`.

- [x] **Task 2: Order Detail View**
    - [x] 2.1 Create `src/app/dashboard/orders/[id]/page.tsx` (Detail View).
    - [x] 2.2 Reuse `OrderDetail.tsx` (from Story 8.6/8.10).
    - [x] 2.3 Implement "Cancel Request" using existing Story 8.20 logic:
        -   Use `POST /api/service-requests/[id]/cancel`.
        -   Or use `cancelServiceRequest` from `src/lib/service-requests.ts`.
        -   Only allowed if status is `pending`.

- [x] **Task 3: Email Notification Infrastructure**
    - [x] 3.1 Setup Resend integration (if not already present).
    - [x] 3.2 Create email template `src/emails/OrderStatusEmail.tsx`.
    - [x] 3.3 Implement `sendOrderStatusEmail` utility function.
    - [x] 3.4 Hook into Status Update API:
        -   Update `PATCH /api/services/request/[id]` (Admin Route) to trigger email when status changes.

- [x] **Task 4: Tests**
    - [x] 4.1 E2E Test (`tests/e2e/orders.spec.ts`):
        -   User visits Orders page.
        -   User sees list of requests.
        -   User navigates to detail view.
    - [x] 4.2 API Test (`tests/api/api-services.test.ts`):
        -   Test `PATCH` status update triggers email mock.
        -   Test `GET` requests returns correct user data.

## Dev Notes

-   **Architecture**:
    -   Uses `service_requests` table.
    -   **Strict Status Enum**: `pending`, `paid`, `in_progress`, `completed`, `cancelled`, `failed`.
    -   Resend API Key should be in env vars (`RESEND_API_KEY`).
    -   Reuse `src/lib/service-requests.ts` for cancel logic.

-   **Dependencies**:
    -   Requires `service_requests` table (Story 8.6/5.2).
    -   Requires Auth (User context).
    -   **Story 8.20 Integration**: Match route `/dashboard/orders/[id]` and use existing cancel API.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List
- Refactored `OrderList` to use a separate `OrderItem` component as requested.
- Confirmed `src/lib/email.ts` already contained `notifyOrderStatusChange` which implements the email logic including templates (inline HTML).
- Created generic status update endpoint `PATCH /api/services/request/[id]` which triggers the email notification.
- Added comprehensive API tests for status updates (`tests/api/request-status-update.test.ts`).
- Verified E2E tests (`tests/e2e/orders.spec.ts`) pass, fixed a strict mode locator issue.
- Review fixes: added GET `/api/services/request` and switched Orders list to call it with explicit user scoping; detail view now also scopes by `user_id`.
- Review fixes: added full metadata rendering in Order Detail and aligned empty-state copy and paid status label with ACs.
- Review fixes: added `src/emails/OrderStatusEmail.tsx` template and `sendOrderStatusEmail` helper (aliasing existing notification logic).
- Review fixes: added API GET test file (`tests/api/api-services.test.ts`) and updated E2E empty state expectations.
- Note: Working tree currently includes unrelated changes (e.g., Story 8.11 and test fixes); file list below reflects all files touched in this change set for transparency.
- Review fixes: corrected status update email lookup to resolve public user profiles by `auth_id`, with fallback to admin auth for email and safe notification inserts.
- Review fixes: avoided duplicate metadata rendering in Order Detail when ISBN/publishing fields are already displayed.
- Review fixes: made OrderItem row keyboard-navigable and used a dedicated manuscript link; updated E2E selectors accordingly.
- Test fix: aligned SubscriptionBanner upgrade link expectation with `/dashboard/settings`.
- Note: `_bmad-output/bmm-workflow-status.yaml` updated by workflow runner; PM to reconcile if needed.

### File List
- src/app/dashboard/orders/page.tsx
- src/app/dashboard/orders/[id]/page.tsx
- src/components/marketplace/OrderList.tsx
- src/components/marketplace/OrderItem.tsx
- src/components/marketplace/OrderDetail.tsx
- src/app/api/services/request/route.ts
- src/app/api/services/request/[id]/route.ts
- src/lib/email.ts
- src/emails/OrderStatusEmail.tsx
- src/lib/marketplace-utils.ts
- tests/e2e/orders.spec.ts
- tests/api/api-services.test.ts
- tests/api/request-status-update.test.ts
- tests/components/marketplace/OrderDetail.test.tsx
- tests/components/marketplace/SubscriptionBanner.test.tsx
- tests/components/settings/SecuritySettings.test.tsx
- tests/manuscripts/versionHistory.test.ts
- src/components/manuscripts/PublishingSettingsForm.tsx
- src/components/manuscripts/PublishingSettingsModal.tsx
- docs/story8.13.md
- _bmad-output/bmm-workflow-status.yaml
- docs/sprint-status.yaml
