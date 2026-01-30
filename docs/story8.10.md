# Story 8.10: Marketplace Redesign (Subscription)

Status: done

**Traceability:** [_bmad-output/traceability-matrix-story-8.10.md](../_bmad-output/traceability-matrix-story-8.10.md) · **Gate:** [PASS](../_bmad-output/gate-decision-story-8.10.md) (2026-01-29)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **Author**,
I want **a redesigned marketplace with clear subscription options and unified service request forms**,
so that **I can easily understand the value of paid plans and request professional services like ISBNs or Author Websites.**

## Acceptance Criteria

### 1. Subscription Banner
- **Given** I am on the Marketplace page
- **When** the page loads
- **Then** a prominent **Subscription Banner** is displayed at the top.
- **And** if I am on the **Free Tier**:
    - The banner highlights "Pro" benefits (e.g., "Get free ISBNs, Ops support").
    - A "Subscribe / Upgrade" CTA button is visible.
- **And** if I am on the **Pro Tier** (or higher):
    - The banner acknowledges my status (e.g., "Pro Member Access Active").
    - Or is hidden/minimized to focus on services (Decision: Show status).

### 2. Service Grid & Cards
- **Given** I view the service grid
- **Then** I see cards for available services:
    - Publishing (Link to existing logic from 8.6)
    - ISBN Registration
    - Author Website
    - Book Marketing
    - Social Media Launch
- **And** each card displays:
    - Service Icon/Image
    - Title & Brief Description
    - "Request" or "Get Started" button.

### 3. Unified Service Request Popup
- **Given** I click a service card (e.g., "Author Website")
- **Then** a **Service Request Modal** opens.
    - *Note:* This should be a generalization of the `PublishingRequestModal` created in Story 8.6.
- **And** the modal title matches the service (e.g., "Request Author Website").
- **And** the modal contains:
    - **Service Type** (hidden/read-only).
    - **Details Form** (Dynamic based on type, or generic text area for MVP).
    - **Submit** button.
- **And** submitting creates a new record in the `service_requests` table.

### 4. Database Integration
- **Given** I submit a service request
- **Then** a record is inserted into `service_requests` using the existing API.
    - `user_id`: Current user.
    - `service_type`: (e.g., 'isbn', 'website', 'marketing').
    - `status`: 'pending'.
    - `metadata` (or `details`): JSON payload of form data.
- **And** I receive a success toast notification.

## Tasks / Subtasks

- [x] **1. Analysis & Refactoring (Reuse 8.6)**
    - [x] Analyze `src/components/manuscripts/PublishingRequestModal.tsx` (from Story 8.6).
    - [x] Refactor it into a generic `ServiceRequestModal.tsx` that accepts `serviceType`, `title`, and `renderFormFields` (or similar prop).
    - [x] Ensure the existing "Publishing" button in Manuscript Editor still works with the refactored modal.

- [x] **2. Marketplace UI Components**
    - [x] Update `src/app/dashboard/marketplace/page.tsx` layout.
    - [x] Create `SubscriptionBanner` component (Check user tier vs `billing_cycles` or mock logic).
    - [x] Update `ServiceGrid` to render the new list of services (ISBN, Website, Marketing, etc.).
    - [x] Wire up `ServiceGrid` items to open the new `ServiceRequestModal`.

- [x] **3. API Integration**
    - [x] Verify `POST /api/services/request` (from Story 8.6) supports generic types.
    - [x] Ensure `service_requests` table exists and `metadata` column is `jsonb`.
    - [x] Update `src/lib/service-requests.ts` or API types to include new service types ('isbn', 'website', 'marketing', 'social_launch').
    - [x] Add validation schemas for new service types if needed (or allow generic metadata for now).

- [x] **4. Integration & Testing**
    - [x] Test Banner logic (Free vs Pro - mock if needed).
    - [x] Test generic Service Request submission (Website/Marketing).
    - [x] Regression Test: Verify "Publishing" request still works from Editor.
    - [x] Verify database record creation for new types.

## Dev Notes

### Dependencies
- **Story 8.6 (Publishing Request):** This story HEAVILY relies on 8.6. 8.6 implemented the `PublishingRequestModal` and `POST /api/services/request`. Do NOT duplicate this logic. Refactor and Extend.
- **Auth (Epic 1):** User must be logged in.

### Technical constraints
- **Table:** `service_requests` (Already exists from 8.6).
- **API:** `POST /api/services/request` (Already exists from 8.6).
- **Styling:** Use standard Parchment Design System (Tailwind/CSS).

### Architecture Alignment
- **Reusability:** The `ServiceRequestModal` should be the single source of truth for requesting services, whether from the Marketplace or the Manuscript Editor.
- **Data:** `service_requests.metadata` stores the form fields.

## Dev Agent Record

### Agent Model Used
- Manual Creation (Scrum Master) + Validation Refinement
- Claude Opus 4.5 (Implementation Verification)
- GPT-5 Codex (Code Review Fixes)

### Implementation Notes
- **Subscription Banner Logic**: Added `NEXT_PUBLIC_SUBSCRIPTION_TIER` override for Free/Pro/Enterprise banner states until billing is wired.
- **Service Request Modal**: Added service type field and blocked publishing requests without manuscript context (CTA to manuscripts).
- **Service Request Toast**: Added success toast for non-manuscript service submissions.
- **Single Source of Truth**: Refactored `PublishingRequestModal` to wrap `ServiceRequestModal`.
- **Test Coverage**: Added publishing regression test in ManuscriptEditor and API mapping tests for new service types.
- **Lint Cleanup**: Removed unused variables/imports and replaced `any` in updated tests.

### File List
- `.env.example` (updated)
- `docs/story8.10.md` (updated)
- `docs/sprint-status.yaml` (updated)
- `src/app/dashboard/marketplace/page.tsx` (updated)
- `src/components/marketplace/ServiceRequestModal.tsx` (updated)
- `src/components/marketplace/ServiceCard.tsx` (updated)
- `src/components/manuscripts/PublishingRequestModal.tsx` (refactored wrapper)
- `tests/api/api-services.test.ts` (updated)
- `tests/marketplace.test.tsx` (updated)
- `tests/components/marketplace/ServiceRequestModal.test.tsx` (updated)
- `tests/components/marketplace/ServiceCard.test.tsx` (updated)
- `tests/components/ServiceCard.test.tsx` (updated)
- `tests/components/manuscripts/ManuscriptEditor.fullscreen.test.tsx` (updated)
- `tests/components/manuscripts/PublishingRequestModal.test.tsx` (updated)

### Working Tree Notes
- The repo contains unrelated in-progress changes (e.g., dashboard/export/order files and QA artifacts) that are **not** part of Story 8.10 and are intentionally excluded from the File List.

### Completion Notes
All acceptance criteria satisfied:
1. **Subscription Banner** - Supports Free/Pro/Enterprise messaging (Pro/Enterprise via `NEXT_PUBLIC_SUBSCRIPTION_TIER` override).
2. **Service Grid & Cards** - ServiceGrid displays all services (Cover Design, ISBN, Editing, Author Website, Marketing, Social Media, Publishing Help, Printing) with proper cards
3. **Unified Service Request Popup** - ServiceRequestModal is generic, includes service type field, and handles publishing-specific fields.
4. **Database Integration** - API mappings verified for all service types; metadata stored in jsonb.
5. **Regression** - Publishing request flow from Manuscript Editor covered by test.

Tests:
- `npx jest --runTestsByPath tests/components/marketplace/ServiceRequestModal.test.tsx tests/components/marketplace/ServiceCard.test.tsx tests/components/manuscripts/ManuscriptEditor.fullscreen.test.tsx tests/marketplace.test.tsx` (4 suites, 47 tests passed; expected console.error logs from negative-path tests)
- `npx eslint tests/components/marketplace/ServiceRequestModal.test.tsx tests/components/marketplace/ServiceCard.test.tsx tests/components/manuscripts/ManuscriptEditor.fullscreen.test.tsx tests/marketplace.test.tsx`
- `npx jest --runTestsByPath tests/components/marketplace/ServiceCard.test.tsx tests/components/ServiceCard.test.tsx tests/components/marketplace/ServiceRequestModal.test.tsx tests/components/manuscripts/PublishingRequestModal.test.tsx tests/components/manuscripts/ManuscriptEditor.fullscreen.test.tsx tests/api/api-services.test.ts tests/marketplace.test.tsx` (7 suites, 91 tests passed; expected console.error logs from negative-path tests)
- `npm test` (88 suites, 657 tests passed; expected console output from negative-path tests)
- `npm run lint` (0 errors, 395 warnings repo-wide)

### Change Log
- 2026-01-29: Verified implementation completeness, fixed test mocks for ServiceGrid and ServiceCard tests
- 2026-01-30: Addressed code review findings (subscription tier override, publishing guard, toast, tests)
- 2026-01-30: Cleaned lint warnings in updated tests (removed unused vars, replaced `any`)
