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

## Dependencies

- **Story 2.1:** Manuscript editor exists
- **Story 1.3:** Database schema + RLS
- **Infrastructure requirement:** Gemini API credentials configured
- **Infrastructure requirement:** Async job runner (Modal or equivalent)

## Implementation Tasks (for Dev Agent)

- [ ] Implement `POST /consistency-check` endpoint (author-triggered)
- [ ] Create async job record in `consistency_checks` table (queued state)
- [ ] Implement Gemini service with:
    - Token estimation
    - Chunking logic (≤500k tokens per chunk)
    - Implicit cache lookup via `input_hash`
- [ ] Implement async worker to:
    - Update job status (queued → running → completed/failed)
    - Store structured `report_json`
    - Add retry logic and failure handling
- [ ] Write integration tests for large manuscripts and retry scenarios

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