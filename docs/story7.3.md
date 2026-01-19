# Story 7.3: Publication Metadata Management

Status: done

<!-- Note: Comprehensive context generated via parallel-planning-workflow -->

## Story

As an Author,
I want to manage the professional metadata for my book (ISBN, Copyright, Dedication),
So that it is ready for professional publication and distribution.

## Acceptance Criteria

### 1. Metadata Form
- [x] New "Publishing Details" tab in Manuscript settings.
- [x] Fields: ISBN-13, ISBN-10, Copyright Year, Copyright Holder, Publisher Name, Edition Number.
- [x] Fields: Dedication, Acknowledgements (Rich Text).
- [x] Fields: BISAC Categories (Searchable dropdown), SEO Keywords (Tags input).

### 2. Validation
- [x] Validate ISBN-13 checksum/format.
- [x] warn if mandatory fields for publishing are empty.

### 3. Frontmatter Generation
- [x] This metadata automatically populates the "Frontmatter" section of the exported artifact (Copyright page, Title page).

### 4. Persistence
- [x] Data saved to `manuscript_metadata` table or JSONB column in `manuscripts`.
- [x] Permission check: Only Author/Admin can edit.

## Tasks / Subtasks

- [x] 1. Database Schema
  - [x] Expand `manuscripts` table with `metadata` JSONB column OR create `manuscript_details` table.
      - *Reasoning*: JSONB is flexible for varying publishing standards.
  - [x] Migration script.

- [x] 2. Validations
  - [x] Implement ISBN validator utility (10 and 13 digit).

- [x] 3. UI Implementation
  - [x] Create `PublishingSettingsForm` component.
  - [x] Implement BISAC category selector (load static list of codes).
  - [x] Rich Text editor instances for Dedication/Acknowledgements.

- [x] 4. Export Integration
  - [x] Update Export Service (Story 2.4) to pull this metadata and render the Copyright Page HTML.

- [x] 5. Review Follow-ups (AI)
  - [x] [AI-Review][Critical] Fix PDF Export missing frontmatter.
  - [x] [AI-Review][Critical] Fix destructive persistence in ManuscriptEditor (Tiptap JSON vs Plain Text).
  - [x] [AI-Review][Medium] Implement searchable BISAC selector.
  - [x] [AI-Review][Medium] Implement Tags input for SEO keywords.
  - [x] [AI-Review][Medium] Fix Ghost Text autosave bypass.

## Dev Notes

### Database
- Use `metadata` JSONB column in `manuscripts` table. Keys: `isbn13`, `copyright_holder`, `bisac_codes` [], `keywords` [].

### Export
- This story heavily influences the output of Story 7.2 (Previewer) and 2.4 (Export). Integration testing with those modules is key.

### References
- [Epic 7](docs/epics.md)

## Dev Agent Record

### Agent Model Used
Antigravity (Parallel Planner) / Gemini CLI

### Debug Log References
-

### Completion Notes List
- Added `metadata` JSONB column to `manuscripts` table.
- Implemented `PublishingSettingsForm` and `PublishingSettingsModal` for managing metadata.
- Implemented ISBN validation and BISAC code selection with search.
- Implemented SEO Keywords tags input.
- Updated `ManuscriptEditor` and `useAutosave` to persist metadata correctly using Tiptap JSON.
- Updated Export Service to include Frontmatter (Title Page, Copyright Page, Dedication, Acknowledgements) in PDF and DOCX exports.
- Added unit tests for validation and UI form.

### File List
- `supabase/migrations/20260119000001_add_manuscript_metadata.sql`
- `src/lib/publication-validation.ts`
- `src/lib/bisac-codes.ts`
- `src/lib/manuscripts.ts`
- `src/lib/useAutosave.ts`
- `src/lib/export.ts`
- `src/app/api/manuscripts/[id]/export/pdf/route.ts`
- `src/components/manuscripts/PublishingSettingsForm.tsx`
- `src/components/manuscripts/PublishingSettingsModal.tsx`
- `src/components/manuscripts/ManuscriptEditor.tsx`
- `src/app/dashboard/manuscripts/[id]/page.tsx`
- `src/app/dashboard/manuscripts/[id]/ManuscriptEditorWrapper.tsx`
- `tests/lib/publication-validation.test.ts`
- `tests/components/manuscripts/PublishingSettingsForm.test.tsx`
