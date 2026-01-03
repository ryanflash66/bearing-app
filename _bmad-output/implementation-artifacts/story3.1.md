# Story 3.1: Manual Gemini Consistency Check

## Description

As an author, I can manually trigger a full-manuscript consistency check. The system runs a deep analysis using Gemini asynchronously so the editor is never blocked, chunks large manuscripts safely, caches repeat checks, and persists results for later review.

## Acceptance Criteria (Gherkin Format)

### AC 3.1.1

- **Given:** A manuscript is loaded
- **When:** I click "Check Consistency"
- **Then:** An async job is created immediately and the UI shows status "Queued" or "Checking"

### AC 3.1.2

- **Given:** A consistency check job is running
- **When:** I continue editing the manuscript
- **Then:** The editor remains fully responsive and is not blocked by the check

### AC 3.1.3

- **Given:** A manuscript larger than 500k tokens
- **When:** The check starts
- **Then:** The manuscript is chunked into safe segments and analyzed without exceeding per-request token limits

### AC 3.1.4

- **Given:** The Gemini request completes successfully
- **When:** Processing finishes
- **Then:** The job status is marked "Completed" and a structured report is stored in the database

### AC 3.1.5

- **Given:** A network or Gemini API failure occurs mid-check
- **When:** The job fails
- **Then:** Status is set to "Failed", an error message is recorded, and I can retry manually without data loss

### AC 3.1.6 (Performance Baseline)

- **Given:** A full manuscript consistency check is triggered
- **When:** Epic 3 is fully deployed to production
- **Then:** A real-world P95 baseline of <15s is established and verified through performance traces to ensure async efficiency.

## Dependencies

- **Story 2.1:** Manuscript editor exists
- **Story 1.3:** Database schema + RLS
- **Infrastructure requirement:** Gemini API credentials configured
- **Infrastructure requirement:** Async job runner (Modal or equivalent)

## Implementation Tasks (for Dev Agent)

- [x] Implement `POST /consistency-check` endpoint (author-triggered)
- [x] Create async job record in `consistency_checks` table (queued state)
- [x] Implement Gemini service with:
    - Token estimation
    - Chunking logic (≤500k tokens per chunk)
    - Implicit cache lookup via `input_hash`
- [x] Implement async worker to:
    - Update job status (queued → running → completed/failed)
    - Store structured `report_json`
    - Add retry logic and failure handling
- [x] Write integration tests for large manuscripts and retry scenarios

## Cost Estimate

- **AI inference:** ~10M tokens/month at 10 authors
- **Storage:** ~$0.10/month (reports JSON)
- **Compute:** ~$0
- **Total:** ~$1.35/month at 10 authors, ~$13.50 at 100

## Latency SLA

- **P95 target:** <15s async completion
- **Rationale:** Deep analysis is heavy but must never block the editor

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Async behavior confirmed (no editor blocking)
- [ ] Chunking works for large manuscripts
- [ ] Cost within estimate
- [ ] No cross-account data access

## Effort Estimate

- **Dev hours:** 16 hours
- **QA hours:** 8 hours
- **Total:** 24 hours

---

## Status

**review**

Ready for code review.

---

## Dev Agent Record

### Implementation Notes

**Database Migration:**
- Created `consistency_checks` table with all required fields: id, manuscript_id, status, model, input_hash, report_json, tokens_estimated, tokens_actual, error_message, created_by, created_at, completed_at
- Added RLS policies for account-based isolation: members can view checks for manuscripts in their account, only owners/admins can create checks
- Added indexes for efficient lookups: manuscript_id, status (for worker polling), input_hash (for cache lookups), created_by
- Status transitions: queued → running → completed/failed

**API Endpoint (AC 3.1.1):**
- `POST /api/manuscripts/[id]/consistency-check` - Initiates async consistency check, returns immediately with job ID and status
- `GET /api/manuscripts/[id]/consistency-check` - Polls job status (supports jobId query param for specific job)
- Returns 202 Accepted for async operations
- Handles token cap errors with 429 status
- Validates manuscript access via RLS

**Gemini Service Library:**
- Token estimation: ~4 characters per token approximation with prompt overhead
- Chunking logic (AC 3.1.3): Splits manuscripts >500k tokens into safe segments, attempts paragraph/sentence boundaries for natural breaks
- Cache lookup: Uses SHA-256 hash of manuscript content to find existing completed checks
- Token cap enforcement: 10M tokens/month per user (will be formalized in Story 3.3)

**Async Worker Processing:**
- `processConsistencyCheckJob` function handles async processing
- Updates job status: queued → running → completed/failed
- Processes chunks sequentially, aggregates all issues into final report
- Stores structured `report_json` with issues array (type, severity, location, explanation, suggestion)
- Calculates actual tokens used (input + output)
- Error handling: Marks job as failed with error_message, allows retry (AC 3.1.5)

**Chunking Implementation (AC 3.1.3):**
- Splits at paragraph boundaries when possible
- Falls back to sentence boundaries for very large paragraphs
- Ensures each chunk ≤500k tokens (with 90% margin for safety)
- Handles edge cases: empty content, single large paragraph

**Caching (AC 3.1.4):**
- Uses `input_hash` (SHA-256 of manuscript content) for cache lookups
- Returns cached completed checks immediately without creating new job
- Prevents duplicate API calls for unchanged content

**Error Handling (AC 3.1.5):**
- Network/API failures caught and stored in `error_message`
- Job status set to "failed" with timestamp
- No data loss - job record persists, can be retried
- Retry logic: User can call POST endpoint again with same manuscript

**Async Behavior (AC 3.1.2):**
- Processing happens asynchronously via `processConsistencyCheckJob` (non-blocking)
- Endpoint returns immediately with job ID
- Editor remains fully responsive during processing
- Status can be polled via GET endpoint

### Debug Log

No blocking issues encountered. Implementation follows existing patterns from llama.ts service.

**Tests:** All 13 tests passing. Fixed Jest/Next.js mocking setup by updating jest.setup.js Response polyfill and properly configuring Supabase client mocks for different query chains.

---

## File List

### New Files
- `supabase/migrations/20241226000000_create_consistency_checks_table.sql` - Database migration for consistency_checks table
- `src/lib/gemini.ts` - Gemini service library with token estimation, chunking, caching, and async processing
- `src/app/api/manuscripts/[id]/consistency-check/route.ts` - API endpoint for initiating and polling consistency checks
- `tests/api/consistency-check.test.ts` - Integration tests for consistency check functionality

### Modified Files
- `docs/sprint-status.yaml` - Updated epic-3 and story 3.1 to in-progress

---

## Change Log

**2024-12-26:**
- Implemented consistency check API endpoint with async job processing
- Created database migration for consistency_checks table with RLS policies
- Implemented Gemini service with token estimation, chunking (≤500k tokens), and caching via input_hash
- Added async worker logic for processing checks with status transitions and error handling
- Wrote comprehensive tests covering large manuscripts, chunking, retry scenarios, and error cases
- All acceptance criteria satisfied: async job creation, non-blocking processing, chunking, completion tracking, and failure handling with retry support