# Story 7.2: WYSIWYG Export Previewer

Status: ready-for-dev

<!-- Note: Comprehensive context generated via parallel-planning-workflow -->

## Story

As an Author,
I want to see exactly how my book will look in PDF or ePub format before I download it,
So that I can fix formatting issues and page breaks immediately.

## Acceptance Criteria

### 1. Preview Interface
- [ ] "Export" modal includes a "Live Preview" toggle.
- [ ] Preview renders using the actual print CSS / layout logic used for PDF generation.
- [ ] Toggle between "PDF View" (Paginated) and "ePub View" (Reflowable, mobile width).

### 2. Live Formatting Settings
- [ ] Controls for: Font Face (Serif/Sans), Font Size, Line Height, Page Size (6x9, 5x8).
- [ ] Preview updates instantly (or <2s) when settings change.

### 3. Chapter & Section Checks
- [ ] Visual indication of Chapter breaks.
- [ ] "Orphan/Widow" check (visual inspection for users).
- [ ] Warning if images or tables exceed page margins.

### 4. Technical Performance
- [ ] Preview generation happens client-side if possible (using CSS Paged Media polyfill) OR fast server-side render.
- [ ] No heavy file downloads for just previewing.

## Tasks / Subtasks

- [ ] 1. Preview Component
  - [ ] Create `ExportPreview` component in React.
  - [ ] Integrate Paged.js (or similar) for browser-based pagination preview.
  - [ ] Implement settings state (Redux/Context).

- [ ] 2. Layout Engine
  - [ ] Refactor existing Export logic (from Story 2.4/2.5) to share styles between CSS Export and PDF Generator (Puppeteer/PrinceXML).
  - [ ] Ensure `print.css` is robust for 6x9 and 5x8 variants.

- [ ] 3. UI Controls
  - [ ] Add Sidebar for formatting options.
  - [ ] Connect controls to CSS variables in the preview wrapper.

- [ ] 4. ePub Simulation
  - [ ] Add "device frame" container to simulate phone/tablet width for ePub mode.

## Dev Notes

### Libraries
- **Paged.js**: Excellent for simulating print layouts in browser.
- **React-PDF**: Alternative, but Paged.js is better for "book" formatting from HTML/CSS source.

### Architecture
- Share the *same* HTML generation logic between this Preview and the actual File Download service to ensure "What You See Is What You Get".

### References
- [Epic 7](docs/epics.md)
- [Story 2.4 Manuscript Export](docs/sprint-status.yaml) (Inherits logic)

## Dev Agent Record

### Agent Model Used
Antigravity (Parallel Planner)

### Debug Log References
-

### Completion Notes List
-

### File List
-
