# Story 8.12: Service submission forms

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an author,
I want to fill out a specific request form for professional services (Author Website, Marketing, Social Launch),
so that I can provide the necessary details to start the service engagement.

## Acceptance Criteria

1.  **AC 8.12.1: Open Service Request modal**
    - **Given** I am on the Marketplace or a manuscript's Services page
    - **When** I click "Request" (or "Learn More" -> "Request") on a service card (e.g., "Author Website", "Book Marketing")
    - **Then** a modal opens titled with the service name (e.g., "Request Author Website").
    - **And** the modal context is linked to the selected manuscript (dropdown if in Marketplace, read-only if in Manuscript context).

2.  **AC 8.12.2: Dynamic Form Fields per Service Type**
    - The modal displays fields specific to the service type:
    - **Author Website:**
        - **Genre/Vibe** (Text/Select)
        - **Existing Website URL** (Optional)
        - **Design Notes** (Textarea)
    - **Book Marketing:**
        - **Target Audience** (Text)
        - **Budget Range** (Select)
        - **Goals** (Textarea)
    - **Social Media:**
        - **Target Platforms** (Multi-select: Instagram, TikTok, etc.)
        - **Current Handles** (Text)
    - **Generic/Other:**
        - **Request Details** (Textarea, required)

3.  **AC 8.12.3: Validation & Submission**
    - **Given** the form is open
    - **When** I fill in required fields and click "Submit Request"
    - **Then** the client calls `POST /api/services/request` with:
        - `manuscriptId`
        - `serviceType` (e.g., `author_website`, `marketing`, `social_media`)
        - `formData` (JSON object with the specific fields)
    - **Then** the modal closes and a success toast appears ("Request submitted").

4.  **AC 8.12.4: Backend Creation**
    - **Given** a valid request payload
    - **When** `POST /api/services/request` is called
    - **Then** a new record is created in `service_requests` table:
        - `manuscript_id` = provided ID
        - `service_type` = provided type
        - `status` = 'pending' (default)
        - `metadata` = `formData` merged with user info
    - **And** an Admin Notification is triggered (if existing notification system allows, otherwise strictly DB record).

5.  **AC 8.12.5: Duplicate Active Request Prevention**
    - **Given** I already have an active request (`pending`, `in_progress`) for "Author Website" on Manuscript X
    - **When** I try to open the request modal for "Author Website" on Manuscript X
    - **Then** the UI prevents it (button disabled or shows "Request Active") OR the API returns `409 Conflict`.
    - **UX Preference:** Button changes to "View Request" if active, linking to Order details (Story 8.13), or at least disables with a tooltip.

## Tasks / Subtasks

- [ ] **Task 1: Service Request Modal Component**
    - [ ] 1.1 Update `src/components/marketplace/ServiceRequestModal.tsx`.
    - [ ] 1.2 Implement dynamic form rendering based on `serviceType` prop (extending the existing `publishing-help` logic).
    - [ ] 1.3 Reuse `IsbnRegistrationModal` logic for manuscript selection (dropdown vs read-only).

- [ ] **Task 2: API Implementation**
    - [ ] 2.1 Update `src/app/api/services/request/route.ts`.
    - [ ] 2.2 Implement validation (zod schema per service type).
    - [ ] 2.3 Implement DB insertion into `service_requests`.
    - [ ] 2.4 Add duplicate check (409 if active request exists for manuscript+service_type).

- [ ] **Task 3: Integration**
    - [ ] 3.1 Update `ServiceCard.tsx` to handle non-ISBN services by opening `ServiceRequestModal`.
    - [ ] 3.2 Ensure `marketplace-data.ts` has correct `serviceType` keys matching the DB/Form logic.

- [ ] **Task 4: Tests**
    - [ ] 4.1 Unit tests for `ServiceRequestModal` (form rendering, validation).
    - [ ] 4.2 API tests for `POST /api/services/request` (success, invalid data, duplicate conflict).

## Dev Notes

- **Service Types:**
  - Define strict types in code (e.g., `ServiceType = 'isbn' | 'author_website' | 'marketing' | 'social_media'`).
  - Match these to `marketplace-data.ts` IDs.
  - **CRITICAL:** `ServiceRequestModal.tsx` and the API route ALREADY EXIST. Do not overwrite them. Extend them to support the new service types alongside existing `publishing-help`.

- **Metadata Structure:**
  - Store form data in `service_requests.metadata` jsonb column.
  - Example: `metadata: { "genre": "Sci-Fi", "budget": "$500-1000", ... }`.

- **Reusability:**
  - `IsbnRegistrationModal` (Story 8.11) is specialized for the Paid/Stripe flow.
  - `ServiceRequestModal` (Story 8.12) is for the "Request/Quote" flow (Pending status).
  - Keep them separate if the flows diverge significantly (Payment vs No Payment), but share UI components (ManuscriptSelector) if possible.

- **API Security:**
  - Ensure `manuscriptId` belongs to the authenticated user (RLS or server-side check).

### Project Structure Notes

- Keep components in `src/components/marketplace/`.
- API routes in `src/app/api/services/`.

## Dev Agent Record

### Agent Model Used
Gemini 2.0 Flash

### Debug Log References
- None yet.

### Completion Notes List
-

### Reference Files (Read First)
- `src/components/marketplace/ServiceRequestModal.tsx` (Extend this)
- `src/app/api/services/request/route.ts` (Extend this)
- `src/lib/marketplace-data.ts` (Service definitions)

### File List
- `src/components/marketplace/ServiceRequestModal.tsx` (Update)
- `src/app/api/services/request/route.ts` (Update)
- `src/components/marketplace/ServiceCard.tsx` (Update)
- `tests/api/services/request.test.ts`
