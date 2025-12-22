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

- [ ] Create `manuscripts` table (draft, `deleted_at`, `updated_at`)
- [ ] Implement editor autosave loop (≤5s debounce, conflict-safe)
- [ ] Add offline buffer with retry queue for failed saves
- [ ] Implement soft delete with scheduled cleanup job
- [ ] Add integration tests for autosave + reconnect scenarios

## Cost Estimate

- **AI inference:** 0 tokens
- **Storage:** ~$0.50/month (manuscript content + drafts)
- **Compute:** ~$0
- **Total:** ~$0.50/month at 10 authors, ~$5 at 100

## Latency SLA

- **P95 target:** 200ms per autosave write
- **Rationale:** Editor must feel instant and uninterrupted

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Autosave interval ≤5s
- [ ] Zero data loss in disconnect tests
- [ ] Cost within estimate
- [ ] No RLS or privacy leaks

## Effort Estimate

- **Dev hours:** 18 hours
- **QA hours:** 6 hours
- **Total:** 24 hours