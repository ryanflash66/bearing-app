# Story 3.2: Structured Consistency Reports

## Description

As an author, I can review consistency check results in a structured report grouped by issue type. The system provides clear navigation to affected sections, handles large reports efficiently, and supports exporting results for offline review.

## Acceptance Criteria (Gherkin Format)

### AC 3.2.1

- **Given:** A completed consistency check
- **When:** I open the report
- **Then:** Issues are grouped by category (character, plot, timeline, tone)

### AC 3.2.2

- **Given:** I click on an issue
- **When:** The issue is selected
- **Then:** The editor scrolls to the relevant chapter and text offset

### AC 3.2.3

- **Given:** A report contains no issues
- **When:** I view it
- **Then:** A clear empty state appears: "No issues detected ✓"

### AC 3.2.4

- **Given:** A report contains more than 50 issues
- **When:** I browse the report
- **Then:** Pagination or virtualization ensures smooth performance

### AC 3.2.5

- **Given:** I request an export
- **When:** I choose JSON or PDF
- **Then:** A downloadable file is generated with the report contents

## Dependencies

- **Story 3.1:** Manual Gemini consistency check
- **Infrastructure requirement:** PDF generation library (for report export)

## Implementation Tasks (for Dev Agent)

- [ ] Design report viewer UI grouped by issue type
- [ ] Implement jump-to-location logic in editor
- [ ] Add pagination or virtual list for large reports
- [ ] Implement JSON export (direct)
- [ ] Implement PDF summary export
- [ ] Add UI and export regression tests

## Cost Estimate

- **AI inference:** 0 tokens
- **Storage:** ~$0 (reports already stored)
- **Compute:** ~$0
- **Total:** ~$0/month at 10 authors, ~$0 at 100

## Latency SLA

- **P95 target:** 500ms report load
- **Rationale:** Reports are read-heavy and must feel instant

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Reports grouped correctly
- [ ] Navigation accuracy validated
- [ ] Large reports performant
- [ ] Cost within estimate

## Effort Estimate

- **Dev hours:** 14 hours
- **QA hours:** 8 hours
- **Total:** 22 hours