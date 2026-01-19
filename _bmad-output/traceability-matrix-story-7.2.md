# Traceability Matrix - Story 7.2: WYSIWYG Export Previewer (REVISED)

**Story:** 7.2 (Export Previewer)
**Date:** 2026-01-19
**Status:** ✅ PASS

## Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status  |
| --------- | -------------- | ------------- | ---------- | ------- |
| P0        | 1              | 1             | 100%       | ✅ PASS |
| P1        | 2              | 2             | 100%       | ✅ PASS |
| P2        | 3              | 2             | 66%        | ⚠️ WARN |
| **Total** | **6**          | **5**         | **83%**    | ✅ PASS |

## Detailed Mapping

### AC-4: PDF Generation using Puppeteer (P0)
- **Coverage:** FULL ✅
- **Tests:**
  - `7.2-UNIT-001` - `tests/lib/export.test.ts`
    - Status: **PASSING**
    - Refactored to use Puppeteer mocks. Validates default dimensions, A4 sizing, and frontmatter.

### AC-3: Export Modal & Live Preview Journey (P1)
- **Coverage:** FULL ✅
- **Tests:**
  - `7.2-E2E-001` - `tests/e2e/export.spec.ts`
    - Validates opening modal from editor and settings persistence.

### AC-6: ePub View Mode (P1)
- **Coverage:** FULL ✅
- **Tests:**
  - `7.2-E2E-002` - `tests/e2e/export.spec.ts`
    - Validates toggling between modes and mobile frame rendering.

### AC-1: PDF WYSIWYG Preview (P2)
- **Coverage:** FULL ✅
- **Tests:**
  - `7.2-COMP-001` - `tests/components/ExportPreview.test.tsx`

### AC-2: Export Settings Management (P2)
- **Coverage:** FULL ✅
- **Tests:**
  - `7.2-COMP-001` - `tests/components/ExportPreview.test.tsx`

### AC-5: Automatic Overflow Warnings (P2)
- **Coverage:** PARTIAL ⚠️
- **Tests:**
  - `7.2-E2E-004` - `tests/e2e/export.spec.ts`
    - Logic scaffolded; requires specific content injection for full validation.

## Quality Assessment
- `tests/lib/export.test.ts` ✅ - Refactored, deterministic, no browser concurrency issues.
- `tests/e2e/export.spec.ts` ✅ - Follows DOD, uses shared auth fixture.

## Recommendations
1. **CI Execution**: Run the new E2E suite in the staging pipeline to confirm real browser behavior.
2. **Overflow content**: Add a specific test manuscript with a 2000px table to `seed.sql` for automated overflow testing.