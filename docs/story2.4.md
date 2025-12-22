# Story 2.4: Manuscript Export (PDF & DOCX)

## Description

As an author, I can export my manuscript or any previous version to PDF or DOCX. The system generates files asynchronously, preserves basic formatting, and completes exports reliably even for large manuscripts.

## Acceptance Criteria (Gherkin Format)

### AC 2.4.1

- **Given:** I click export PDF
- **When:** Export completes
- **Then:** A PDF downloads with correct title and content

### AC 2.4.2

- **Given:** I export DOCX
- **When:** I open it in Word
- **Then:** Text, bold, italics, and lists are preserved

### AC 2.4.3

- **Given:** A manuscript >500K characters
- **When:** Export is requested
- **Then:** Export completes within 10 seconds

### AC 2.4.4

- **Given:** Multiple versions exist
- **When:** I select a version to export
- **Then:** The selected version is used

## Dependencies

- **Story 2.1:** Manuscripts exist
- **Story 2.2:** Version history exists
- **Infrastructure requirement:** PDF/DOCX generation libraries available

## Implementation Tasks (for Dev Agent)

- [ ] Implement export service (PDFKit + DOCX lib)
- [ ] Support version selection
- [ ] Add async job handling for large exports
- [ ] Clean up temporary files after download
- [ ] Add export correctness tests

## Cost Estimate

- **AI inference:** 0 tokens
- **Storage:** negligible
- **Compute:** ~$0
- **Total:** ~$0/month at 10 authors, ~$0 at 100

## Latency SLA

- **P95 target:** 10s for large exports
- **Rationale:** Export is async and non-interactive

## Success Criteria (QA Gate)

- [ ] All ACs verified
- [ ] Formatting preserved
- [ ] Large exports succeed
- [ ] Cost within estimate
- [ ] No cross-account data leakage

## Effort Estimate

- **Dev hours:** 14 hours
- **QA hours:** 6 hours
- **Total:** 20 hours