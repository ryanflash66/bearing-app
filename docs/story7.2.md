# Story 7.2: WYSIWYG Export Previewer

Status: done

<!-- Note: Comprehensive context generated via parallel-planning-workflow -->

## Story
...
### Completion Notes List
- Created `ExportPreview` using Paged.js for PDF WYSIWYG preview.
- Implemented `ExportContext` to manage print settings (font, size, line-height).
- Created `ExportModal` with sidebar controls and Live Preview toggle.
- **Architectural Fix**: Switched PDF generation from PDFKit to **Puppeteer** to ensure True WYSIWYG by sharing the exact CSS/HTML logic with the preview.
- Added automatic **Overflow Warnings** for images and tables exceeding page margins in the preview.
- Added `ePub` view mode simulating a mobile device frame.
- Integrated `ExportModal` into `ManuscriptEditor`.

### File List
- src/components/export/ExportContext.tsx
- src/components/export/ExportPreview.tsx
- src/components/manuscripts/ExportModal.tsx
- src/components/manuscripts/ManuscriptEditor.tsx
- src/lib/export.ts
- src/lib/export-types.ts
- src/app/api/manuscripts/[id]/export/pdf/route.ts
- public/print.css
- tests/components/ExportPreview.test.tsx
- tests/lib/export.test.ts
