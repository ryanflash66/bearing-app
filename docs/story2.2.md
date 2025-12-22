# Story 2.2: Version History & Restore

## Description

As an author, I can view a chronological history of manuscript versions and restore any previous version without losing my current work. The system stores immutable snapshots, supports pagination, and ensures restores are safe and reversible.

## Acceptance Criteria (Gherkin Format)

### AC 2.2.1

- **Given:** I have edited a manuscript multiple times
- **When:** I open version history
- **Then:** Versions appear in reverse chronological order with timestamps

### AC 2.2.2

- **Given:** I select a previous version
- **When:** I click restore
- **Then:** The current version is saved and the selected version becomes active

### AC 2.2.3

- **Given:** More than 30 versions exist
- **When:** I scroll version history
- **Then:** Pagination or virtual scrolling loads all versions correctly

### AC 2.2.4

- **Given:** I restore a version
- **When:** Restore completes
- **Then:** No versions are deleted and restore is itself recorded as a new version

## Dependencies

- **Story 2.1:** Manuscript CRUD + Autosave
- **Infrastructure requirement:** Postgres storage optimized for snapshots

## Implementation Tasks (for Dev Agent)

- [ ] Create `manuscript_versions` table (content snapshot, `created_at`)
- [ ] Write version snapshot logic on autosave thresholds
- [ ] Implement restore flow with safety copy of current version
- [ ] Add pagination or cursor-based loading
- [ ] Write regression tests for restore correctness

## Cost Estimate

- **AI inference:** 0 tokens
- **Storage:** ~$1/month at 100 authors
- **Compute:** ~$0
- **Total:** ~$0/month at 10 authors, ~$1 at 100

## Latency SLA

- **P95 target:** 300ms for version list load
- **Rationale:** Snapshot reads must be fast but non-blocking

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Restores are reversible
- [ ] No data loss
- [ ] Cost within estimate
- [ ] RLS enforced on all version rows

## Effort Estimate

- **Dev hours:** 14 hours
- **QA hours:** 6 hours
- **Total:** 20 hours