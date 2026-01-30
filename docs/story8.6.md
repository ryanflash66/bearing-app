# Story 8.6: Publishing flow — Service request popup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an author,
I want to submit a publishing request from my manuscript’s Publishing panel,
so that NGANDIWEB can handle publishing while my manuscript is locked during the request.

## Acceptance Criteria

1. **AC 8.6.1: Open “Publishing request” modal from manuscript editor**
   - **Given** I am viewing a manuscript in the editor (`/dashboard/manuscripts/[id]`)
   - **When** I click the **Publishing** button in the editor toolbar
   - **Then** a modal opens that is focused on **submitting a publishing service request** (not general “publishing metadata” editing)

2. **AC 8.6.2: Modal fields + prefill + removals**
   - The modal includes the following fields (with the listed behaviors):
     - **ISBN** (optional)
       - Supports **ISBN-10** and **ISBN-13**
       - Reuses existing ISBN cleaning/validation logic (no new/duplicate ISBN validators)
     - **Category** (required)
       - Uses existing BISAC categories data
       - Prefills from manuscript metadata when present
       - If missing, user must select at least one category before submitting
     - **Keywords** (required)
       - User must provide at least one keyword/tag
       - Prefills from manuscript metadata keywords when present
     - **Acknowledgements** (optional but shown)
       - Prefills from manuscript acknowledgements when present
       - User can review/edit in the modal
     - **Education level** (optional but shown)
       - Prefills from manuscript education level when present
       - User can review/edit in the modal
   - The modal **does not include**:
     - Copyright year, copyright holder
     - Publisher name
     - Edition number
     - Dedication

3. **AC 8.6.3: Warning text + CTA label**
   - The modal shows this warning text prominently:
     - “Before you publish this book, your manuscript will be sent to NGANDIWEB for publishing. You cannot edit this manuscript while the request is active.”
   - The primary CTA button label is **“Send publishing request”**.

4. **AC 8.6.4: Client-side validation**
   - The “Send publishing request” button is disabled until:
     - Category is selected (at least one BISAC code).
     - At least one keyword is provided.
     - If an ISBN is present, it passes ISBN-10/ISBN-13 validation.

5. **AC 8.6.5: Persist edited manuscript metadata before submitting**
   - **Given** I edit Acknowledgements and/or Education level in the modal
   - **When** I click “Send publishing request”
   - **Then** the manuscript metadata is saved first (to `manuscripts.metadata`) before the service request is created.

6. **AC 8.6.6: Create publishing-help service request with metadata payload**
   - On submit, the client calls `POST /api/services/request` with JSON body:
     - `serviceId: "publishing-help"`
     - `manuscriptId: <current manuscript UUID>`
     - `metadata: { ... }` containing the request form values
   - The API stores the request payload into `service_requests.metadata` (while preserving existing server-set keys like `requested_at` / `service_title`).
   - On success:
     - The modal closes.
     - The editor refreshes so the existing service lock + banner behavior from Story 8.20 appears.

7. **AC 8.6.7: Duplicate active request handling (409)**
   - If an active request already exists for the manuscript:
     - The API returns **409 Conflict** with code `DUPLICATE_ACTIVE_REQUEST`.
     - The modal shows a friendly message and provides a link/button to **My Orders**:
       - Prefer deep-link: `/dashboard/orders/{existingRequestId}` when provided by the API.
       - Fallback: `/dashboard/orders`.

## Tasks / Subtasks

- [x] **Task 1: Add "Publishing request" modal + form** (AC: 8.6.1–8.6.4)
  - [x] 1.1 Create a dedicated modal component under `src/components/manuscripts/` (do not overload `PublishingSettingsModal` with unrelated concerns).
  - [x] 1.2 Reuse existing data/validation where available:
    - BISAC options: `src/components/manuscripts/PublishingSettingsForm.tsx` + `src/lib/bisac-codes`.
    - ISBN cleaning/validation: `src/lib/publication-validation.ts`.
  - [x] 1.3 Implement fields per AC (ISBN optional, BISAC required, keywords required, acknowledgements + education level review/edit).
  - [x] 1.4 Remove/avoid fields not needed for requests (copyright/publisher/edition/dedication).
  - [x] 1.5 Add warning text + "Send publishing request" CTA.

- [x] **Task 2: ManuscriptEditor integration** (AC: 8.6.1–8.6.3, 8.6.6)
  - [x] 2.1 Wire the existing Publishing toolbar button in `src/components/manuscripts/ManuscriptEditor.tsx` to open the new request modal.
  - [x] 2.2 After successful request creation, close modal and call `router.refresh()` (to trigger the existing 8.20 lock + banner).

- [x] **Task 3: Save manuscript metadata before request creation** (AC: 8.6.5)
  - [x] 3.1 Ensure edits to acknowledgements / education level are persisted to `manuscripts.metadata` before calling `/api/services/request`.
  - [x] 3.2 Do not rely solely on the debounced autosave timer; persist explicitly as part of submit.

- [x] **Task 4: Extend `POST /api/services/request` to accept publishing metadata** (AC: 8.6.6–8.6.7)
  - [x] 4.1 Update `src/app/api/services/request/route.ts` to accept an optional `metadata` object in the request body.
  - [x] 4.2 For `serviceId === "publishing-help"`, validate:
    - at least one keyword.
    - at least one BISAC code/category.
    - ISBN (if present) is valid (10 or 13).
  - [x] 4.3 Merge client-provided `metadata` into the inserted row's `service_requests.metadata` while preserving existing server-set metadata keys.
  - [x] 4.4 Preserve existing duplicate-active-request behavior (409 + `DUPLICATE_ACTIVE_REQUEST`).

- [x] **Task 5: Orders detail displays publishing metadata (optional)** (AC: 8.6.6)
  - [x] 5.1 Extend `src/components/marketplace/OrderDetail.tsx` to display relevant publishing request metadata for `service_type === "publishing_help"`.

- [x] **Task 6: Tests** (AC: all)
  - [x] 6.1 Add API tests for publishing-help metadata validation + duplicate 409 behavior (follow patterns in existing `tests/api/*` service request tests).
  - [x] 6.2 Add component tests for modal required-field validation and disabled submit (RTL).

## Dev Notes

- For deeper architecture and cross-story context, see `docs/8-6-publishing-service-request-popup.md` (contains extended Dev Notes and references).

## Dev Agent Record

### Agent Model Used

gpt-5.1

### Debug Log References

- Story 8.6 extended context: `docs/8-6-publishing-service-request-popup.md`.
- Service lock & sync behavior (Story 8.20): `docs/8-20-sync-manuscript-service.md`.
- Service request API & types: `src/app/api/services/request/route.ts`, `src/lib/service-requests.ts`, `src/lib/marketplace-utils.ts`, `src/types/supabase.ts`.

### Completion Notes List

- Story 8.6 implemented with all ACs covered.
- Created dedicated `PublishingRequestModal.tsx` component with ISBN/BISAC/keywords/acknowledgements/education level fields.
- Wired Publishing button in ManuscriptEditor to open the new modal.
- Added explicit metadata save handler that persists to manuscripts.metadata before API call.
- Extended API route to accept and validate publishing-help metadata (keywords required, BISAC required, ISBN validated if present).
- Extended OrderDetail to display publishing request metadata.
- Added comprehensive tests for API validation and component behavior.

### File List

- `docs/story8.6.md`
- `docs/8-6-publishing-service-request-popup.md`
- `docs/sprint-status.yaml`
- `src/components/manuscripts/PublishingRequestModal.tsx` (new)
- `src/components/manuscripts/ManuscriptEditor.tsx` (modified)
- `src/app/api/services/request/route.ts` (modified)
- `src/components/marketplace/OrderDetail.tsx` (modified)
- `tests/api/api-services.test.ts` (modified)
- `tests/components/marketplace/OrderDetail.test.tsx` (modified)
- `tests/components/manuscripts/PublishingRequestModal.test.tsx` (new)

## Senior Developer Review

### Findings
- **Critical Issues**: None.
- **Medium Issues**: Fixed uncommitted junk file `tests/components/settings/ts/PublishingRequestModal.test.tsx`.
- **Low Issues**:
  - Improved type safety in `ManuscriptEditor.tsx` by using `PublishingRequestMetadata` interface.
  - Enhanced API robustness in `src/app/api/services/request/route.ts` to strictly require `manuscriptId` for publishing-help requests.
  - Verified and fixed test cases to align with stricter validation logic.
- **Status**: Passed code review and verification.
