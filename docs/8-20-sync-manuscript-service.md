# Story 8.20: Sync & State (Manuscript ↔ Service)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **author**,
I want **to see when my manuscript has an active service request and be prevented from editing it during that time**,
so that **the service team works with a stable version and I don't accidentally change content that's being processed**.

## Acceptance Criteria

1. **AC 8.20.1: Active Request Detection** - When opening a manuscript in the editor, the system checks for any active service request (status = `pending`, `paid`, or `in_progress`) linked to that manuscript.

2. **AC 8.20.2: Service Status Banner** - If an active request exists, display a prominent banner in the manuscript editor showing:
   - Service type (e.g., "Publishing Request", "ISBN Registration")
   - Current status (Pending → Paid → In Progress)
   - A "Cancel Request" button (only for `pending` status)
   - A "View Order" link to the specific order/request (preferred: `/dashboard/orders/{requestId}`, fallback: `/dashboard/orders`)

3. **AC 8.20.3: Edit Locking** - When an active service request exists (`pending`, `paid`, or `in_progress`), the manuscript editor is in read-only mode:
   - TipTap editor is set to `editable: false`
   - Autosave and any save triggers are disabled (no writes while locked)
   - Title field is disabled
   - Clear visual indicator that editing is locked
   - Reason displayed: "Editing locked while [service type] request is active"

4. **AC 8.20.4: Cancel Request Flow** - Users can cancel `pending` requests directly from the manuscript editor:
   - Cancel button only appears for `pending` status
   - Confirmation modal before cancellation
   - On success: Request status → `cancelled`, editor unlocks immediately
   - Error handling with user-friendly messages

5. **AC 8.20.5: Duplicate Prevention** - The system prevents creating multiple active requests for the same manuscript:
   - Database constraint: Only one request with status in (`pending`, `paid`, `in_progress`) per `manuscript_id`
   - API validation before creating new service request
   - User-friendly error: "This manuscript already has an active [service type] request"

6. **AC 8.20.6: Status Sync** - When a service request status changes (admin fulfillment or cancellation):
   - Manuscript editor reflects new state on next load
   - If status becomes `completed`, `cancelled`, or `failed` → editing unlocks
   - No real-time sync required; page refresh updates state

7. **AC 8.20.7: Manuscript List Integration** - The manuscript list shows a badge/indicator for manuscripts with active service requests.

## Tasks / Subtasks

- [x] **Task 1: Database Migration** (AC: 4, 5)
  - [x] 1.1 Create migration `YYYYMMDDHHMMSS_add_active_request_constraint.sql`
  - [x] 1.2 Add partial unique index: `CREATE UNIQUE INDEX idx_service_requests_manuscript_active ON service_requests(manuscript_id) WHERE status IN ('pending', 'paid', 'in_progress') AND manuscript_id IS NOT NULL;`
  - [x] 1.3 Add index for efficient lookup: `CREATE INDEX idx_service_requests_manuscript_status ON service_requests(manuscript_id, status) WHERE manuscript_id IS NOT NULL;`
  - [x] 1.4 Ensure user-initiated cancel is possible under RLS (pick one approach and document it in the migration):
    - Option A (preferred): Add a narrowly-scoped UPDATE policy allowing a user to set their own request to `cancelled` only when currently `pending`
    - Option B: Keep UPDATE admin-only and implement cancel through a strictly-guarded server route using an admin-aware client with owner verification

- [x] **Task 2: API Endpoints** (AC: 1, 4, 5, 6)
  - [x] 2.1 Create `GET /api/manuscripts/[id]/service-status` - returns active service request if exists
  - [x] 2.2 Create `POST /api/service-requests/[id]/cancel` - cancels a pending request
  - [x] 2.3 Update `POST /api/services/request` to:
    - Set `service_requests.manuscript_id` from `manuscriptId` (do not store this only in `metadata`)
    - Check for existing active request before creating
  - [x] 2.4 Add proper error codes:
    - 409 Conflict for duplicate active request (API validation OR unique index violation)
    - 403 Forbidden for cancel attempts by non-owner (or when RLS rejects)

- [x] **Task 3: Service Request Lib Functions** (AC: 1, 4, 5)
  - [x] 3.1 Create `src/lib/service-requests.ts` with:
    - `getActiveServiceRequest(supabase, manuscriptId)` - fetch active request for manuscript
    - `cancelServiceRequest(supabase, requestId)` - cancel a pending request
    - `hasActiveServiceRequest(supabase, manuscriptId)` - boolean check
  - [x] 3.2 Add TypeScript types for service request operations

- [x] **Task 4: ServiceStatusBanner Component** (AC: 2, 3, 4)
  - [x] 4.1 Create `src/components/manuscripts/ServiceStatusBanner.tsx`
  - [x] 4.2 Implement status display with service type, status badge, and timestamps
  - [x] 4.3 Add "Cancel Request" button (conditional on `pending` status)
  - [x] 4.4 Add "View Order" link (prefer deep-link to `/dashboard/orders/{requestId}`, fallback to `/dashboard/orders`)
  - [x] 4.5 Implement cancel confirmation modal using existing modal patterns
  - [x] 4.6 Style with amber/warning colors for pending, blue for in_progress

- [x] **Task 5: ManuscriptEditor Integration** (AC: 1, 2, 3, 6)
  - [x] 5.1 Add `activeServiceRequest` prop to ManuscriptEditor
  - [x] 5.2 Fetch active request in `ManuscriptEditorWrapper.tsx` (server component)
  - [x] 5.3 Pass `isLocked` flag based on active request existence
  - [x] 5.4 Conditionally render ServiceStatusBanner at top of editor
  - [x] 5.5 Disable TipTap editor when `isLocked` (`editable={!isLocked}`)
  - [x] 5.6 Ensure no writes while `isLocked`:
    - Prevent calling `queueSave` / `saveNow` while locked
    - Disable title edits and any other save triggers
    - Optional: add an explicit `disabled` option to `useAutosave` for clarity
  - [x] 5.7 Add visual lock indicator (lock icon, grayed-out UI)

- [x] **Task 6: ManuscriptList Badge** (AC: 7)
  - [x] 6.1 Update manuscript list data load to include an "hasActiveServiceRequest" boolean (avoid N+1):
    - One query for manuscripts
    - One query for active service requests for those manuscript IDs, then map client-side (or a join/exists equivalent if already supported in your query layer)
  - [x] 6.2 Add "Service Pending" badge to manuscripts with active requests
  - [x] 6.3 Style badge consistent with existing status badges

- [x] **Task 7: Testing** (AC: all)
  - [x] 7.1 Unit tests for `src/lib/service-requests.ts` functions (`tests/lib/service-requests.test.ts`)
  - [x] 7.2 API route tests for new endpoints (`tests/api/service-status.test.ts`, `tests/api/cancel-request.test.ts`)
  - [ ] 7.3 Component tests for ServiceStatusBanner (deferred - requires React testing setup)
  - [ ] 7.4 Integration test: Create request → verify lock → cancel → verify unlock (deferred - requires E2E setup)

### Review Follow-ups (AI)
- [ ] [AI-Review][MEDIUM] Add component tests for ServiceStatusBanner when React Testing Library setup is available [src/components/manuscripts/ServiceStatusBanner.tsx]
- [ ] [AI-Review][MEDIUM] Add E2E integration test for full lock/unlock flow when Playwright/Cypress is configured [tests/e2e/]

## Dev Notes

### Critical Architecture Patterns

**Status Values Reference (from migration 20260114):**

```sql
CREATE TYPE service_request_status AS ENUM (
  'pending',      -- Created but not yet paid
  'paid',         -- Payment received, awaiting fulfillment
  'in_progress',  -- Being worked on by admin/designer
  'completed',    -- Service delivered
  'cancelled',    -- Cancelled/refunded
  'failed'        -- Payment failed
);
```

**Active statuses that lock editing:** `pending`, `paid`, `in_progress`
**Inactive statuses (editing allowed):** `completed`, `cancelled`, `failed`

### Existing Code to Reuse

1. **Service Request Types:** `src/types/supabase.ts` (lines 508-564) - Use `Tables<"service_requests">`
2. **Marketplace Utils:** `src/lib/marketplace-utils.ts` - `getStatusConfig()`, `getServiceLabel()`
3. **Status Badge Pattern:** `src/components/manuscripts/ManuscriptList.tsx` - `getStatusBadge()` function
4. **Modal Pattern:** Use existing confirmation modals from `src/components/ui/`
5. **Autosave Hook:** `src/lib/useAutosave.ts` - Gate saves in the editor when locked (or add a small `disabled` option if needed)

### Database Constraint Implementation

The partial unique index ensures only ONE active request per manuscript:

```sql
-- Prevents: Two requests with manuscript_id=X where both have status='pending'
-- Allows: One 'pending' + one 'completed' for same manuscript
CREATE UNIQUE INDEX idx_service_requests_manuscript_active
ON service_requests(manuscript_id)
WHERE status IN ('pending', 'paid', 'in_progress')
AND manuscript_id IS NOT NULL;
```

### Important Data Linking Note (manuscript_id vs metadata)

For sync + locking to work, the active-request lookup must match on the real `service_requests.manuscript_id` column (not only `metadata.manuscript_id`). Ensure all service-request creation flows populate `service_requests.manuscript_id` when a manuscript is selected.

If there are existing rows that only stored the manuscript ID in `metadata`, consider a one-time backfill in the migration (only where safe) so legacy requests are detected correctly.

### API Response Patterns

**GET /api/manuscripts/[id]/service-status:**

```typescript
// Success with active request
{ activeRequest: ServiceRequest, isLocked: true }

// No active request
{ activeRequest: null, isLocked: false }
```

**POST /api/service-requests/[id]/cancel:**

```typescript
// Success
{ success: true, request: ServiceRequest }

// Error: Not pending
{ error: "Only pending requests can be cancelled", code: "INVALID_STATUS" }

// Error: Not owner
{ error: "Unauthorized", code: "FORBIDDEN" }
```

### RLS / Authorization Note (Cancel)

User-facing cancellation must be compatible with RLS. Either:

- Allow users to update their own request to `cancelled` only when currently `pending` (recommended), or
- Perform cancellation in the API route using an admin-aware client, while explicitly verifying the request belongs to the current user and is `pending`.

### File Locations

| Component            | Path                                                                   |
| -------------------- | ---------------------------------------------------------------------- |
| New lib functions    | `src/lib/service-requests.ts`                                          |
| New banner component | `src/components/manuscripts/ServiceStatusBanner.tsx`                   |
| Editor integration   | `src/components/manuscripts/ManuscriptEditor.tsx`                      |
| Editor wrapper       | `src/app/dashboard/manuscripts/[id]/ManuscriptEditorWrapper.tsx`       |
| API service status   | `src/app/api/manuscripts/[id]/service-status/route.ts`                 |
| API cancel request   | `src/app/api/service-requests/[id]/cancel/route.ts`                    |
| Migration            | `supabase/migrations/YYYYMMDDHHMMSS_add_active_request_constraint.sql` |

### Testing Standards

- Use Jest for unit tests (`tests/lib/service-requests.test.ts`)
- Use React Testing Library for components
- Mock Supabase client using existing patterns from `tests/`
- Test both success and error paths
- Test RLS policy compliance (user can only cancel own requests)

### Project Structure Notes

- Alignment with unified project structure: All new files follow existing patterns
- API routes use standard Next.js App Router conventions
- Components follow PascalCase naming
- Lib functions follow camelCase naming
- Use `@/` imports for all internal imports

### References

- [Source: docs/prd-epic-8.md#Story 8.20]
- [Source: _bmad-output/bearing-todo-plan.md#2.2 Publishing & service requests]
- [Source: supabase/migrations/20260114000000_create_service_marketplace_tables.sql]
- [Source: src/lib/marketplace-utils.ts]
- [Source: src/components/manuscripts/ManuscriptEditor.tsx]

### Dependencies

- **Depends on:** Stories 8.6, 8.10, 8.11, 8.12 (service request creation flows)
- **Blocks:** Story 8.13 (My Orders - relies on proper sync for status display)

### Known Patterns from Previous Work

From recent commits (Story 5.8, 6.3, 7.1, 7.2):

- Use `getAdminAwareClient` for admin-level operations only
- Always specify FK constraint names in Supabase queries with multiple FKs
- Server components fetch data, pass to client components as props
- Use `createClient()` from `@/utils/supabase/client` for client-side operations

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Tasks 7.3 and 7.4 deferred: Component and E2E tests require additional test infrastructure setup
- Review fixes applied: corrected service-status ownership check, blocked manual save while locked, added banner fallback link, fixed tests, removed unused imports

### File List

**New Files Created:**
- `src/lib/service-requests.ts` - Service request lib functions (getActiveServiceRequest, cancelServiceRequest, hasActiveServiceRequest, getActiveServiceRequestsForManuscripts)
- `src/components/manuscripts/ServiceStatusBanner.tsx` - Banner component showing active service status with cancel functionality
- `src/app/api/manuscripts/[id]/service-status/route.ts` - GET endpoint for active service request detection
- `src/app/api/service-requests/[id]/cancel/route.ts` - POST endpoint to cancel pending requests
- `supabase/migrations/20260128133528_add_active_request_constraint.sql` - Migration for partial unique index, lookup index, and RLS cancel policy
- `tests/lib/service-requests.test.ts` - Unit tests for service-requests lib
- `tests/api/service-status.test.ts` - API tests for service-status endpoint
- `tests/api/cancel-request.test.ts` - API tests for cancel endpoint

**Modified Files:**
- `docs/8-20-sync-manuscript-service.md` - Review fixes and updated file list
- `docs/validation-report-20260128132850.md` - Story validation report
- `docs/sprint-status.yaml` - Sprint tracking status
- `src/app/api/services/request/route.ts` - Added manuscript_id column population and duplicate active request check
- `src/app/dashboard/manuscripts/[id]/page.tsx` - Added activeServiceRequest fetch and prop passing
- `src/app/dashboard/manuscripts/[id]/ManuscriptEditorWrapper.tsx` - Added activeServiceRequest prop
- `src/app/dashboard/manuscripts/page.tsx` - Added batch active request fetch for manuscript list
- `src/app/dashboard/manuscripts/ManuscriptListWrapper.tsx` - Added activeServiceRequests prop passing
- `src/components/manuscripts/ManuscriptEditor.tsx` - Added isLocked logic, ServiceStatusBanner integration, disabled saves when locked
- `src/components/manuscripts/ManuscriptList.tsx` - Added "Service Active" badge display
- `src/components/editor/TiptapEditor.tsx` - Added editable state change handler for lock/unlock
- `tests/api/api-services.test.ts` - Added mocks for service-requests and marketplace-utils
