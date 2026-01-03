# Story 2.1: Manuscript CRUD + Autosave

## Description

As an authenticated author, I can create, edit, and delete manuscripts in a distraction-free editor. The system automatically saves changes in the background at a maximum 5-second interval, guarantees zero data loss even during network interruptions, and enforces account-level isolation via RLS.

## Acceptance Criteria (Gherkin Format)

### AC 2.1.1

- **Given:** I am editing a manuscript
- **When:** 5 seconds pass without further input
- **Then:** The current content is autosaved to the database without blocking the UI

### AC 2.1.2

- **Given:** My network connection drops during editing
- **When:** Connectivity is restored
- **Then:** All local edits are synced and no content is lost or overwritten

### AC 2.1.3

- **Given:** I create a new manuscript
- **When:** The editor loads
- **Then:** A draft manuscript row is created and autosave begins immediately

### AC 2.1.4

- **Given:** I request deletion of a manuscript
- **When:** I confirm deletion
- **Then:** The manuscript is soft-deleted and recoverable for 30 days

### AC 2.1.5

- **Given:** A large manuscript (>1M characters)
- **When:** Autosave executes
- **Then:** Save completes within 5 seconds (P95) without editor lag

## Dependencies

- **Story 1.1:** Authentication must exist
- **Story 1.3:** Database schema + RLS policies
- **Infrastructure requirement:** Supabase Realtime or polling for autosave sync

## Implementation Tasks (for Dev Agent)

- [x] Create `manuscripts` table (draft, `deleted_at`, `updated_at`)
- [x] Implement editor autosave loop (≤5s debounce, conflict-safe)
- [x] Add offline buffer with retry queue for failed saves
- [x] Implement soft delete with scheduled cleanup job
- [x] Add integration tests for autosave + reconnect scenarios

## Cost Estimate

- **AI inference:** 0 tokens
- **Storage:** ~$0.50/month (manuscript content + drafts)
- **Compute:** ~$0
- **Total:** ~$0.50/month at 10 authors, ~$5 at 100

## Latency SLA

- **P95 target:** 200ms per autosave write
- **Rationale:** Editor must feel instant and uninterrupted

## Success Criteria (QA Gate)

- [x] All ACs verified
- [x] Autosave interval ≤5s
- [x] Zero data loss in disconnect tests
- [x] Cost within estimate
- [x] No RLS or privacy leaks

## Effort Estimate

- **Dev hours:** 18 hours
- **QA hours:** 6 hours
- **Total:** 24 hours

---

## Status

**qa-approved**

QA Report: See `docs/qa-report.story-2.1.md`

---

## Dev Agent Record

### Implementation Notes

**Database Migration:**
- Created `manuscripts` table with all required fields: id, account_id, owner_user_id, title, status, content_json, content_text, content_hash, word_count, last_saved_at, deleted_at, created_at, updated_at
- Added RLS policies for account-based isolation: members can view active manuscripts, admins can view deleted ones for recovery
- Added triggers for auto-updating word_count and updated_at timestamps
- Added index on deleted_at for efficient cleanup job queries

**Autosave Implementation:**
- useAutosave hook implements 5-second debounced saving (AC 2.1.1)
- Optimistic locking via expectedUpdatedAt prevents conflicts
- Conflict detection returns `conflictDetected: true` for UI handling

**Offline Support (AC 2.1.2):**
- IndexedDB used for persistent offline storage
- Automatic sync when coming back online
- beforeunload handler saves pending changes to localStorage as backup
- Retry queue with exponential backoff (up to 5 retries)

**Soft Delete (AC 2.1.4):**
- `deleted_at` timestamp for soft delete
- 30-day retention before permanent deletion
- Cleanup job API at `/api/manuscripts/cleanup` with API key protection
- Audit logging of purged manuscripts

**Performance (AC 2.1.5):**
- Large content (1M+ chars) tested to complete under 5 seconds
- Word count calculation done in database trigger for efficiency

### Debug Log

No blocking issues encountered.

---

## File List

### New Files
- `supabase/migrations/20241223000000_create_manuscripts_table.sql` - Database migration
- `src/lib/manuscripts.ts` - CRUD operations library
- `src/lib/useAutosave.ts` - Autosave hook with offline support
- `src/components/manuscripts/ManuscriptEditor.tsx` - Distraction-free editor component
- `src/components/manuscripts/ManuscriptList.tsx` - Manuscript list component
- `src/app/dashboard/manuscripts/page.tsx` - Manuscripts list page
- `src/app/dashboard/manuscripts/ManuscriptListWrapper.tsx` - Client wrapper for list
- `src/app/dashboard/manuscripts/new/page.tsx` - Create new manuscript
- `src/app/dashboard/manuscripts/[id]/page.tsx` - Edit manuscript page
- `src/app/dashboard/manuscripts/[id]/ManuscriptEditorWrapper.tsx` - Editor client wrapper
- `src/app/api/manuscripts/cleanup/route.ts` - Cleanup job API endpoint
- `tests/manuscripts/manuscript.test.ts` - Integration tests

### Modified Files
- `src/lib/account.ts` - Added `getFirstUserAccount` function
- `src/app/dashboard/page.tsx` - Added real manuscript stats and working quick actions
- `docs/sprint-status.yaml` - Updated epic-2 and story 2.1 to in-progress

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2024-12-23 | Initial implementation of manuscript CRUD with autosave | Dev Agent |
| 2024-12-23 | Added offline buffer with IndexedDB persistence | Dev Agent |
| 2024-12-23 | Implemented soft delete with 30-day retention cleanup job | Dev Agent |
| 2024-12-23 | Added 13 integration tests covering all acceptance criteria | Dev Agent |
| 2024-12-23 | Updated dashboard with real manuscript stats | Dev Agent |