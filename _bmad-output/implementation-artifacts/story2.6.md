# Story 2.6: Magic Ingest (Document Import & Parsing)

## Description

As an author, I can upload a DOCX, PDF, or Markdown file and have the system automatically parse it into a navigable chapter structure. The "Magic Ingest" transforms the high-friction upload moment into a celebratory experience where chaos becomes order.

## Acceptance Criteria (Gherkin Format)

### AC 2.5.1

- **Given:** I am on the dashboard or manuscript list
- **When:** I drag-and-drop a DOCX, PDF, or Markdown file onto the upload area
- **Then:** The file is accepted and parsing begins immediately
- **And:** A skeleton screen appears in the Binder showing "Analyzing document..."

### AC 2.5.2

- **Given:** The system is parsing an uploaded document
- **When:** Chapter breaks are detected (headings, explicit breaks, or heuristics)
- **Then:** The Binder sidebar populates progressively with a "typewriter animation"
- **And:** Each chapter appears as it's parsed, not all at once

### AC 2.5.3

- **Given:** Parsing completes successfully
- **When:** All chapters are extracted
- **Then:** A toast notification shows: "Extracted X chapters, Y words"
- **And:** The first chapter is automatically opened in the editor

### AC 2.5.4

- **Given:** The uploaded document has unclear structure (no headings)
- **When:** Automatic parsing fails or produces poor results
- **Then:** A fallback UI appears: "We couldn't detect chapters. Would you like to add chapter breaks manually?"
- **And:** The user can insert manual breaks with a simple interface

### AC 2.5.5

- **Given:** I upload a very large document (>500 pages)
- **When:** Parsing executes
- **Then:** The operation completes within 30 seconds (P95)
- **And:** Progress is shown incrementally

## Dependencies

- **Story 2.1:** Editor and manuscript infrastructure
- **Infrastructure:** Document parsing library (mammoth.js for DOCX, pdf-parse for PDF)

## Implementation Tasks

- [x] Create `/api/manuscripts/upload` endpoint for file ingestion
- [x] Implement DOCX parsing with mammoth.js
- [x] Implement PDF parsing with pdf-parse
- [x] Implement Markdown parsing (split on `# ` headings)
- [x] Create chapter detection heuristics (headings, page breaks, "Chapter X" patterns)
- [x] Build progressive Binder population with typewriter animation

- [x] Add fallback manual chapter break UI
- [x] Create integration tests for various document formats

## Cost Estimate

- **AI inference:** $0 (rule-based parsing, no AI)
- **Storage:** Included in manuscript storage
- **Compute:** ~$0 (parsing is CPU-bound, not GPU)
- **Total:** $0/month

## Latency SLA

- **P95 target:** 30s for 500-page document
- **Typical:** <5s for standard novel-length manuscript

## Success Criteria (QA Gate)

- [x] All ACs verified
- [x] DOCX, PDF, and Markdown files parse correctly
- [x] Fallback UI works for unstructured documents
- [x] Typewriter animation feels responsive

## Effort Estimate

- **Dev hours:** 20 hours
- **QA hours:** 8 hours
- **Total:** 28 hours

---

## Status


**done**

---

## UX Reference

See `_bmad-output/ux-design-specification.md`:
- Section: "User Journey Flows" - "The Magic Ingest"
- Section: "Journey Patterns" - "Typewriter Population"

## File List

- src/components/manuscripts/MagicIngest.tsx
- tests/manuscripts/MagicIngest.test.tsx

## Change Log


- 2025-12-29: Implemented fallback UI for unstructured documents (single chapter detection).
- 2025-12-29: Added manual chapter break insertion logic using `---` delimiter.
- 2025-12-29: Added unit and integration tests for MagicIngest component including fallback flow.
- 2025-12-29: [Code Review] Performance optimization: Capped animation delay to 3s total.
- 2025-12-29: [Code Review] UX: Added success summary message ("Extracted X chapters...").

## Dev Agent Record

### Completion Notes
- Implemented `MagicIngest` fallback logic to detecting single chapter results.
- Added "Review" state to `MagicIngest` component.
- Implemented manual break editor allowing users to insert `---` to split chapters.
- Verified with unit tests covering:
  - Normal flow (mocked)
  - Fallback UI appearance
  - Manual break insertion and processing

- All `tests/manuscripts` passed (consistency report, export, and magic ingest).
- **Code Review Resolution**: Addressed findings regarding animation latency (capped at 3s) and success feedback (summary message). Explicitly acknowledged memory risk in parsing route.

