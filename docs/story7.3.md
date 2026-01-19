# Story 7.3: Publication Metadata Management

Status: ready-for-dev

<!-- Note: Comprehensive context generated via parallel-planning-workflow -->

## Story

As an Author,
I want to manage the professional metadata for my book (ISBN, Copyright, Dedication),
So that it is ready for professional publication and distribution.

## Acceptance Criteria

### 1. Metadata Form
- [ ] New "Publishing Details" tab in Manuscript settings.
- [ ] Fields: ISBN-13, ISBN-10, Copyright Year, Copyright Holder, Publisher Name, Edition Number.
- [ ] Fields: Dedication, Acknowledgements (Rich Text).
- [ ] Fields: BISAC Categories (Searchable dropdown), SEO Keywords (Tags input).

### 2. Validation
- [ ] Validate ISBN-13 checksum/format.
- [ ] warn if mandatory fields for publishing are empty.

### 3. Frontmatter Generation
- [ ] This metadata automatically populates the "Frontmatter" section of the exported artifact (Copyright page, Title page).

### 4. Persistence
- [ ] Data saved to `manuscript_metadata` table or JSONB column in `manuscripts`.
- [ ] Permission check: Only Author/Admin can edit.

## Tasks / Subtasks

- [ ] 1. Database Schema
  - [ ] Expand `manuscripts` table with `metadata` JSONB column OR create `manuscript_details` table.
      - *Reasoning*: JSONB is flexible for varying publishing standards.
  - [ ] Migration script.

- [ ] 2. Validations
  - [ ] Implement ISBN validator utility (10 and 13 digit).

- [ ] 3. UI Implementation
  - [ ] Create `PublishingSettingsForm` component.
  - [ ] Implement BISAC category selector (load static list of codes).
  - [ ] Rich Text editor instances for Dedication/Acknowledgements.

- [ ] 4. Export Integration
  - [ ] Update Export Service (Story 2.4) to pull this metadata and render the Copyright Page HTML.

## Dev Notes

### Database
- Use `metadata` JSONB column in `manuscripts` table. Keys: `isbn13`, `copyright_holder`, `bisac_codes` [], `keywords` [].

### Export
- This story heavily influences the output of Story 7.2 (Previewer) and 2.4 (Export). Integration testing with those modules is key.

### References
- [Epic 7](docs/epics.md)

## Dev Agent Record

### Agent Model Used
Antigravity (Parallel Planner)

### Debug Log References
-

### Completion Notes List
-

### File List
-
