# Story 8.11: ISBN registration flow

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an author,
I want to purchase/request ISBN registration from the Marketplace (or from a manuscript's Services page),
so that I can get an official ISBN for my book without leaving the platform.

## Acceptance Criteria

1.  **AC 8.11.1: Open "ISBN Registration" modal**
    - **Given** I am on the Marketplace
    - **When** I click the **Buy ISBN** button on the **ISBN Registration** service card
    - **Then** a modal opens titled **"ISBN Registration"** (or "ISBN Registration Details").

    - **Given** I am on a manuscript's Services page (`/dashboard/manuscripts/[id]/services`)
    - **When** I click the **Buy ISBN** button on the **ISBN Registration** service card
    - **Then** the same ISBN modal opens, with the manuscript pre-selected (no manuscript dropdown required).

2.  **AC 8.11.2: Manuscript selection + empty states**
    - **Marketplace context (no manuscriptId passed in):**
      - The modal includes a **Manuscript** dropdown (required) listing my active manuscripts.
      - If I have no manuscripts, the primary CTA is disabled and a clear empty state links to create/open manuscripts.

    - **Manuscript context (manuscriptId provided):**
      - The modal shows the selected manuscript as read-only (no selector).

3.  **AC 8.11.3: Modal fields + prefill**
    - The modal includes the following fields:
        - **Author Name** (Required)
        - **Category** (Required): select a BISAC category (single-select is fine for MVP).
    - **Prefill behavior**:
        - When a manuscript is selected, attempt to prefill from `manuscripts.metadata` (if present).
        - If manuscript metadata is missing these values, fall back to the user's profile display name for Author Name.

4.  **AC 8.11.4: Validation + CTA**
    - The primary CTA is **Buy ISBN** (or "Continue to payment").
    - The CTA is disabled until:
        - A manuscript is selected (unless manuscriptId is already provided by the page context).
        - Author Name is not empty.
        - Category is selected.

5.  **AC 8.11.5: Initiate paid ISBN flow (Stripe checkout)**
    - **Given** valid form data
    - **When** I click **Buy ISBN**
    - **Then** the client calls `POST /api/checkout/isbn` with JSON body including:
        - `manuscriptId: <selected manuscript UUID>`
        - `metadata: { author_name, bisac_code }` (exact keys can be adjusted, but must be consistent end-to-end)
    - **Then** the API creates a Stripe Checkout session and returns `{ url, poolWarning }`.
    - **Then** the client redirects to Stripe checkout (respecting any existing pool warning confirmation UX).

6.  **AC 8.11.6: Service request creation + metadata persistence**
    - **Given** the Stripe checkout completes successfully
    - **When** the webhook `checkout.session.completed` is received
    - **Then** a new record is created in `service_requests` with:
      - `service_type = 'isbn'`
      - `manuscript_id = <selected manuscript UUID>`
      - `status = 'pending'` (then admin can move it through `paid`/`in_progress`/`completed`)
      - `metadata` includes the ISBN request details submitted in the modal (author name + category), merged with existing server-set metadata keys.

7.  **AC 8.11.7: Duplicate active request prevention (no "pay then fail")**
    - **Given** I have an active service request for the selected manuscript (status in `pending`, `paid`, `in_progress`)
    - **When** I try to start the ISBN checkout flow for that manuscript
    - **Then** the system prevents it **before** redirecting to Stripe checkout:
      - API responds `409 Conflict` with code `DUPLICATE_ACTIVE_REQUEST` and `existingRequestId` when available.
      - UI shows a friendly message and a link to **View Order** (`/dashboard/orders/{existingRequestId}` preferred, fallback `/dashboard/orders`).

    - **Implementation note:** A DB partial unique index already enforces one active request per manuscript; this AC specifically requires an application-level pre-check so we never charge a user and then fail to create the request due to the index.

## Tasks / Subtasks

- [x] **Task 1: ISBN modal UI (collect details before Stripe)**
    - [x] 1.1 Create a dedicated modal component for ISBN details (e.g., `src/components/marketplace/IsbnRegistrationModal.tsx`).
    - [x] 1.2 Manuscript selection:
      - If `manuscriptId` prop is provided, render selected manuscript read-only.
      - Otherwise, fetch the user's manuscripts via Supabase client and render a dropdown.
    - [x] 1.3 Implement **Author Name** and **Category (BISAC)** fields with prefill from `manuscripts.metadata` when available.
    - [x] 1.4 Implement validation and disable the CTA until valid.

- [x] **Task 2: Wire modal into ISBN card**
    - [x] 2.1 Update `src/components/marketplace/ServiceCard.tsx` so ISBN opens the ISBN modal (instead of immediately redirecting to Stripe).
    - [x] 2.2 Ensure manuscript-scoped services page passes `manuscriptId` through (`/dashboard/manuscripts/[id]/services` already provides this).

- [x] **Task 3: Extend checkout API to accept ISBN request details + duplicate pre-check**
    - [x] 3.1 Update `POST /api/checkout/isbn` (`src/app/api/checkout/isbn/route.ts`) to accept:
      - `manuscriptId` (required for this story's flow)
      - `metadata` fields for ISBN request details (author name + category)
    - [x] 3.2 Add a pre-check: if `manuscriptId` has an active request (statuses `pending|paid|in_progress`), return `409 DUPLICATE_ACTIVE_REQUEST` before creating the Stripe session.
    - [x] 3.3 Include the ISBN details metadata in the Stripe session metadata (stringify if needed) so it can be persisted on webhook.

- [x] **Task 4: Persist ISBN request details on webhook**
    - [x] 4.1 Update `src/app/api/webhooks/stripe/route.ts` to merge the ISBN request detail fields into `service_requests.metadata` when creating the row.
    - [x] 4.2 Ensure the webhook remains idempotent (existing `stripe_session_id` check must still prevent duplicates).

- [x] **Task 5: Tests**
    - [x] 5.1 Update/add component tests to cover the ISBN modal (validation + submit calls `/api/checkout/isbn` with the right payload).
    - [x] 5.2 Update `tests/api/checkout/isbn.test.ts` to cover:
      - rejects duplicate active request (409)
      - includes the request detail metadata in Stripe session creation.
    - [x] 5.3 Update webhook tests to ensure metadata merge behavior is correct.

## Dependencies

- **Story 8.10**: Marketplace Redesign (triggers this modal).
- **Story 8.20**: Sync & state (duplicate active request constraint + editor locking depends on `service_requests.manuscript_id`).
- **Story 5.2**: ISBN purchase workflow (Stripe checkout + webhook creates the `service_requests` row for `service_type = 'isbn'`).

## Dev Notes

- **Canonical service type / IDs**
  - Frontend ISBN service id: `"isbn"` (see `src/lib/marketplace-data.ts`).
  - Database enum: `service_type = 'isbn'` (see `supabase/migrations/20260114000000_create_service_marketplace_tables.sql`).
  - Do not introduce a new `serviceId` like `"isbn_registration"`.

- **Flow alignment**
  - ISBN is a paid flow: UI → `POST /api/checkout/isbn` → Stripe → webhook creates the `service_requests` record.
  - Do not use `POST /api/services/request` for ISBN purchases.

- **Avoid "pay then fail"**
  - A DB partial unique index enforces one active request per manuscript (`idx_service_requests_manuscript_active`).
  - The checkout API must pre-check and return 409 for duplicates before creating a Stripe session.

- **Metadata storage**
  - ISBN request details (author name + category) must end up in `service_requests.metadata` so Admin Orders/My Orders can display them later.

- **UX consistency**
  - Keep styling consistent with other marketplace modals (Parchment/Tailwind patterns).
  - Preserve existing ISBN pool warning confirmation behavior (if pool is empty).

## Dev Agent Record

### Implementation Plan
1. Created IsbnRegistrationModal component with manuscript selection (dropdown for marketplace, read-only for manuscript context)
2. Implemented Author Name and Category (BISAC) fields with prefill from manuscript metadata
3. Added validation - CTA disabled until manuscript, author name, and category are all provided
4. Updated ServiceCard to open ISBN modal instead of direct Stripe redirect
5. Extended checkout API with duplicate pre-check (409 DUPLICATE_ACTIVE_REQUEST)
6. Added ISBN metadata (author_name, bisac_code) to Stripe session metadata
7. Updated webhook to merge ISBN metadata into service_requests.metadata
8. Added comprehensive tests for new functionality

### Debug Log
- No significant issues encountered during implementation

### Completion Notes
✅ Story 8.11 implementation complete

**Key changes:**
- New `IsbnRegistrationModal.tsx` component handles manuscript selection, form fields, and validation
- Prefill logic: manuscript metadata → user display name fallback for author name
- ServiceCard now opens ISBN modal on "Buy ISBN" click
- ServiceGrid and pages updated to pass `userDisplayName` prop through
- Checkout API pre-checks for duplicate active requests before Stripe session creation
- Webhook merges `isbn_author_name` and `isbn_bisac_code` into `service_requests.metadata`
- Tests added for 409 duplicate check and metadata flow
 - Review fixes: added ISBN modal component tests, enforced API validation for required fields, and updated ServiceCard tests to match modal flow

## File List

### New Files
- `src/components/marketplace/IsbnRegistrationModal.tsx` - ISBN registration modal component
- `tests/components/marketplace/IsbnRegistrationModal.test.tsx` - ISBN registration modal tests

### Modified Files
- `src/components/marketplace/ServiceCard.tsx` - Opens ISBN modal instead of direct checkout
- `src/components/marketplace/ServiceGrid.tsx` - Passes userDisplayName to ServiceCard
- `src/app/dashboard/marketplace/page.tsx` - Passes userDisplayName to ServiceGrid
- `src/app/dashboard/manuscripts/[id]/services/page.tsx` - Passes userDisplayName to ServiceGrid
- `src/app/api/checkout/isbn/route.ts` - Validates required ISBN payload, adds duplicate pre-check
- `src/app/api/webhooks/stripe/route.ts` - Merges ISBN metadata into service_requests
- `tests/api/checkout/isbn.test.ts` - Added tests for duplicate check and metadata
- `tests/api/webhooks/stripe.test.ts` - Added tests for ISBN metadata merge
- `tests/components/marketplace/ServiceCard.test.tsx` - Updated ISBN flow expectations
- `tests/components/ServiceCard.test.tsx` - Updated ISBN flow expectations

### Documentation / Tracking
- `docs/sprint-status.yaml` - Sprint tracking update
- `docs/story8.11.md` - Story record updates
- `docs/story8.13.md` - Story draft (adjacent epic)
- `docs/validation-report-story-8.13.md` - Validation report artifact
- `docs/Browser QA Testing.docx` - QA artifact

## Change Log

| Date | Change |
|------|--------|
| 2026-02-01 | Initial implementation of ISBN registration flow (Story 8.11) |
| 2026-02-01 | Review fixes: ISBN modal tests, API validation, and test alignment |
