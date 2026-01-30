# Story 8.6: Publishing flow — Service request popup

Status: ready-for-dev

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
       - Prefills from `manuscript.metadata` when present
       - If missing, user must select at least one category before submitting
     - **Keywords** (required)
       - User must provide at least one keyword/tag
       - Prefills from `manuscript.metadata.keywords` when present
     - **Acknowledgements** (optional but shown)
       - Prefills from `manuscript.metadata.acknowledgements` when present
       - User can review/edit in the modal
     - **Education level** (optional but shown)
       - Prefills from `manuscript.metadata.education_level` when present
       - User can review/edit in the modal
   - The modal **does not include** these existing publishing metadata fields:
     - Copyright year, copyright holder
     - Publisher name
     - Edition number
     - Dedication

3. **AC 8.6.3: Warning text + CTA label**
   - The modal shows this warning text prominently:
     - “Before you publish this book, your manuscript will be sent to NGANDIWEB for publishing. You cannot edit this manuscript while the request is active.”
   - The primary CTA button label is **“Send publishing request”**

4. **AC 8.6.4: Client-side validation**
   - The “Send publishing request” button is disabled until:
     - Category is selected (at least one BISAC code)
     - At least one keyword is provided
     - If an ISBN is present, it passes ISBN-10/ISBN-13 validation

5. **AC 8.6.5: Persist edited manuscript metadata before submitting**
   - **Given** I edit Acknowledgements and/or Education level in the modal
   - **When** I click “Send publishing request”
   - **Then** the manuscript metadata is saved first (to `manuscripts.metadata`) before the service request is created

6. **AC 8.6.6: Create publishing-help service request with metadata payload**
   - On submit, the client calls `POST /api/services/request` with JSON body:
     - `serviceId: "publishing-help"`
     - `manuscriptId: <current manuscript UUID>`
     - `metadata: { ... }` containing the request form values
   - The API stores the request payload into `service_requests.metadata` (while preserving existing server-set keys like `requested_at` / `service_title`).
   - On success:
     - The modal closes
     - The editor refreshes so the **existing service lock + banner behavior** (Story 8.20) appears

7. **AC 8.6.7: Duplicate active request handling (409)**
   - If an active request already exists for the manuscript:
     - The API returns **409 Conflict** with code `DUPLICATE_ACTIVE_REQUEST`
     - The modal shows a friendly message and provides a link/button to **My Orders**:
       - Prefer deep-link: `/dashboard/orders/{existingRequestId}` when provided by the API
       - Fallback: `/dashboard/orders`

## Tasks / Subtasks

- [ ] **Task 1: Add “Publishing request” modal + form** (AC: 8.6.1–8.6.4)
  - [ ] 1.1 Create a dedicated modal component under `src/components/manuscripts/` (do not overload `PublishingSettingsModal` with unrelated concerns).
  - [ ] 1.2 Reuse existing data/validation where available:
    - BISAC options: `src/components/manuscripts/PublishingSettingsForm.tsx` + `src/lib/bisac-codes`
    - ISBN cleaning/validation: `src/lib/publication-validation.ts`
  - [ ] 1.3 Implement fields per AC (ISBN optional, BISAC required, keywords required, acknowledgements + education level review/edit).
  - [ ] 1.4 Remove/avoid fields not needed for requests (copyright/publisher/edition/dedication).
  - [ ] 1.5 Add warning text + “Send publishing request” CTA.

- [ ] **Task 2: ManuscriptEditor integration** (AC: 8.6.1–8.6.3, 8.6.6)
  - [ ] 2.1 Wire the existing Publishing toolbar button in `src/components/manuscripts/ManuscriptEditor.tsx` to open the new request modal.
  - [ ] 2.2 After successful request creation, close modal and call `router.refresh()` (to trigger the existing 8.20 lock + banner).

- [ ] **Task 3: Save manuscript metadata before request creation** (AC: 8.6.5)
  - [ ] 3.1 Ensure edits to `acknowledgements` / `education_level` are persisted to `manuscripts.metadata` before calling `/api/services/request`.
  - [ ] 3.2 Do not rely solely on the debounced autosave timer; persist explicitly as part of submit.

- [ ] **Task 4: Extend `POST /api/services/request` to accept publishing metadata** (AC: 8.6.6–8.6.7)
  - [ ] 4.1 Update `src/app/api/services/request/route.ts` to accept an optional `metadata` object in the request body.
  - [ ] 4.2 For `serviceId === "publishing-help"`, validate:
    - at least one keyword
    - at least one BISAC code/category
    - ISBN (if present) is valid (10 or 13)
  - [ ] 4.3 Merge client-provided `metadata` into the inserted row’s `service_requests.metadata` while preserving existing server-set metadata keys.
  - [ ] 4.4 Preserve existing duplicate-active-request behavior (409 + `DUPLICATE_ACTIVE_REQUEST`).

- [ ] **Task 5: Orders detail displays publishing metadata (optional)** (AC: 8.6.6)
  - [ ] 5.1 Extend `src/components/marketplace/OrderDetail.tsx` to display relevant publishing request metadata for `service_type === "publishing_help"`.

- [ ] **Task 6: Tests** (AC: all)
  - [ ] 6.1 Add API tests for publishing-help metadata validation + duplicate 409 behavior (follow patterns in existing `tests/api/*` service request tests).
  - [ ] 6.2 Add component tests for modal required-field validation and disabled submit (RTL).

## Dev Notes

- **Architecture & patterns**
  - **Service locking is already implemented in Story 8.20** – do **not** reimplement locking; instead:
    - Reuse `getActiveServiceRequest` / `ServiceStatusBanner` and the `activeServiceRequest` prop that already flows into `ManuscriptEditor`.
    - Rely on the existing `/api/manuscripts/[id]/service-status` + `/api/service-requests/[id]/cancel` routes and `service_requests` partial unique index.
  - **Publishing request is just another `service_requests` row**:
    - `service_type = 'publishing_help'` in DB (frontend `serviceId: "publishing-help"`).
    - Use `service_requests.metadata` for the popup form payload; do not introduce new tables for this story.

- **Relevant code to reuse**
  - **Manuscript editor & metadata**
    - `ManuscriptEditor` client component: `src/components/manuscripts/ManuscriptEditor.tsx`
      - Already wires the **Publishing** button and passes `initialMetadata` into local `metadata` state.
      - Uses `handleMetadataUpdate` + `useAutosave` (`src/lib/useAutosave.ts`) to persist `manuscripts.metadata`.
    - `PublishingSettingsModal` and `PublishingSettingsForm`: `src/components/manuscripts/PublishingSettingsModal.tsx`, `PublishingSettingsForm.tsx`
      - These manage publishing metadata (ISBN, BISAC, keywords, acknowledgements) and already use:
        - `BISAC_CODES` from `src/lib/bisac-codes`
        - `cleanISBN`, `isValidISBN10`, `isValidISBN13` from `src/lib/publication-validation.ts`
      - For 8.6 you can either:
        - Add a **“Request publishing”** mode to this flow, or
        - Create a **separate, lighter modal** that reuses the same form/validation utilities but has its own CTA and layout.
  - **Service request plumbing**
    - API route: `src/app/api/services/request/route.ts`
      - Already maps `"publishing-help" -> "publishing_help"` and enforces **one active request per manuscript** using:
        - `getActiveServiceRequest` from `src/lib/service-requests.ts`
        - Partial unique index `idx_service_requests_manuscript_active` (see Story 8.20 dev notes).
      - Extend this route to accept and validate a `metadata` object for publishing requests instead of creating a new endpoint.
    - Marketplace request client: `src/components/marketplace/ServiceCard.tsx`
      - Calls `/api/services/request` for non-ISBN services.
      - Use its error-handling pattern (parsing JSON, surfacing `data.error`) when wiring the new publishing popup client call.
  - **Order display**
    - `OrderDetail` component: `src/components/marketplace/OrderDetail.tsx`
      - Already reads `order.metadata` for ISBN orders; extend this to display key publishing metadata for `service_type === "publishing_help"` (e.g. category, keywords).

- **Non-negotiables / guardrails**
  - **Do not bypass RLS or service-request constraints**:
    - Only create/cancel requests via the existing API routes; do not perform direct client Supabase writes to `service_requests`.
  - **Do not duplicate validation logic**:
    - Reuse `publication-validation` helpers and BISAC data rather than adding new regexes or hard-coded lists.
  - **Respect App Router + params-as-Promise convention**:
    - Any new route handlers must follow the existing pattern: `params: Promise<{ id: string }>` and `const { id } = await params;`.
  - **Keep UX consistent with existing modals**:
    - Follow modal styling and animation conventions from `PublishingSettingsModal` and `ServiceStatusBanner` (Parchment design system, focus management, escape/overlay behavior).
  - **Error messages**:
    - For 409 duplicate active requests, prefer the same wording as the API (`DUPLICATE_ACTIVE_REQUEST`) but wrapped in a friendly UI message that points clearly to **My Orders**.

## Dev Agent Record

### Agent Model Used

gpt-5.1

### Debug Log References

- Story 8.20 implementation & lock behavior: `docs/8-20-sync-manuscript-service.md`
- Service request API & types: `src/app/api/services/request/route.ts`, `src/lib/service-requests.ts`, `src/lib/marketplace-utils.ts`, `src/types/supabase.ts`
- Epic + client source: `docs/prd-epic-8.md`, `bearing-todo.md`

### Completion Notes List

- Story file created/updated via BMAD `create-story` for 8.6.
- Acceptance criteria aligned with Epic 8 + bearing-todo and mapped to concrete implementation tasks.
- Dev Notes capture reuse of existing publishing metadata, service-request, and lock/sync infrastructure (no new tables).
- Sprint status updated from `backlog` to `ready-for-dev` for `8-6-publishing-service-request-popup`.

### File List

- `docs/8-6-publishing-service-request-popup.md`
- `docs/sprint-status.yaml`
