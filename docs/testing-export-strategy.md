# Export Testing Strategy

This document explains the testing strategy for manuscript export functionality (PDF and DOCX).

## Overview

The export functionality has two layers of testing to balance speed, stability, and coverage:

### 1. Standard E2E Tests (Fast, Stable)

**Location:** `tests/e2e/export.spec.ts` (non-tagged tests)

**Environment:** Runs with `E2E_TEST_MODE=1`

**What they validate:**
- Download flow and API integration
- HTTP response headers (Content-Type, Content-Disposition)
- RFC 5987 filename encoding
- Error handling and user feedback
- UI interactions (export modal, settings, etc.)

**What they DON'T validate:**
- Actual PDF/DOCX content generation
- Real Puppeteer-based PDF rendering
- Real docx library DOCX generation

**When they run:**
- Every commit (PR checks)
- Local development (`npm run test:e2e`)
- CI pipeline

**Why this approach:**
- Fast: No Puppeteer overhead (~100ms vs ~5-10s per test)
- Stable: Avoids flakiness from headless browser PDF generation
- Focused: Tests the download flow without testing library internals

### 2. Real Export Tests (Comprehensive, Slower)

**Location:** `tests/e2e/export.spec.ts` (tests tagged with `@real-export`)

**Environment:** Runs WITHOUT `E2E_TEST_MODE` (real exports)

**What they validate:**
- Actual PDF generation using Puppeteer
- Actual DOCX generation using docx library
- Real file content and format validation
- Custom formatting settings (font size, line height, etc.)
- File size verification (ensures substantial output)

**When they run:**
- Nightly in CI (2 AM UTC) via `.github/workflows/nightly-export-tests.yml`
- Manually on demand (see commands below)
- Before releasing export feature changes

**Why this approach:**
- Comprehensive: Validates end-to-end export functionality
- Periodic: Catches regressions without slowing down every commit
- On-demand: Can be run locally when making export changes

## Running Tests Locally

### Standard E2E Tests (Fast)
```bash
# Run all export E2E tests with E2E_TEST_MODE
npx playwright test tests/e2e/export.spec.ts

# Run with UI mode for debugging
npx playwright test tests/e2e/export.spec.ts --ui
```

### Real Export Tests (Comprehensive)
```bash
# Run only real export tests (without E2E_TEST_MODE)
npx playwright test tests/e2e/export.spec.ts --grep @real-export

# Run with headed browser for debugging
npx playwright test tests/e2e/export.spec.ts --grep @real-export --headed

# Run a specific test
npx playwright test tests/e2e/export.spec.ts --grep "should generate and download a real PDF"
```

### Important Notes for Real Export Tests
- These tests take 5-10 seconds each (vs ~100ms for standard tests)
- May be flaky in some environments (especially Windows + network drives)
- Require actual Chromium browser (installed via `npx playwright install`)
- Files are downloaded to temp directory and validated

## CI Pipeline

### Standard CI (Every Commit)
- Runs standard E2E tests with `E2E_TEST_MODE=1`
- Fast feedback loop (~2-3 minutes for all E2E tests)
- Gates PRs and main branch

### Nightly CI (Daily at 2 AM UTC)
- Workflow: `.github/workflows/nightly-export-tests.yml`
- Runs real export tests with `E2E_TEST_MODE` unset
- Full validation of PDF/DOCX generation
- Failures are reported but don't block development
- Can be manually triggered via GitHub Actions UI

## Test Structure

### Standard Tests
```typescript
test.describe('Export Download Fix (Story 8.1)', () => {
  // Fast tests with E2E_TEST_MODE=1
  // Validate download flow, headers, error handling
});
```

### Real Export Tests
```typescript
test.describe('Real Export Tests @real-export', () => {
  test('should generate and download a real PDF', async ({ authenticatedPage }) => {
    // Skip if E2E_TEST_MODE is enabled
    if (process.env.E2E_TEST_MODE === "1") {
      test.skip();
      return;
    }
    
    // Test actual PDF generation and validation
  });
});
```

## Implementation Details

### Export Route Behavior

**PDF Route:** `src/app/api/manuscripts/[id]/export/pdf/route.ts`

```typescript
// When E2E_TEST_MODE=1: Returns minimal PDF stub (~50 bytes)
// Otherwise: Generates real PDF using Puppeteer (1KB - 10MB+)
if (process.env.E2E_TEST_MODE === "1") {
  return minimalPdfStub();
}
return generateRealPdf();
```

**DOCX Route:** `src/app/api/manuscripts/[id]/export/docx/route.ts`

```typescript
// When E2E_TEST_MODE=1: Returns minimal ZIP header (4 bytes)
// Otherwise: Generates real DOCX using docx library (1KB - 10MB+)
if (process.env.E2E_TEST_MODE === "1") {
  return minimalDocxStub();
}
return generateRealDocx();
```

### Test Fixtures

**Auth Fixture:** `tests/e2e/fixtures/auth.fixture.ts`
- Provides authenticated Playwright page
- Handles test user setup and teardown
- Used by all export tests

## When to Run Which Tests

### Before Committing
```bash
# Run standard E2E tests for quick validation
npx playwright test tests/e2e/export.spec.ts
```

### Before Merging Export Changes
```bash
# Run real export tests to ensure functionality works
npx playwright test tests/e2e/export.spec.ts --grep @real-export
```

### After Deployment
- Nightly tests run automatically
- Monitor GitHub Actions for failures
- Real export tests catch environment-specific issues

## Troubleshooting

### Real Export Tests Fail Locally
1. Ensure Playwright browsers are installed: `npx playwright install --with-deps`
2. Verify `E2E_TEST_MODE` is not set: `unset E2E_TEST_MODE`
3. Check for Puppeteer issues: Look for Chrome/Chromium errors
4. Try running with headed browser: `--headed` flag

### Real Export Tests Fail in CI
1. Check GitHub Actions logs for specific error
2. Verify environment variables are set correctly
3. Look for memory/timeout issues (increase timeout if needed)
4. Consider if this is a known flaky test

### Standard Tests Pass But Real Tests Fail
- This indicates a real bug in export functionality
- Standard tests only validate the download flow, not content
- Fix the underlying export logic (Puppeteer or docx library)
- Run real tests locally to debug

## Future Improvements

1. **Visual Regression Testing**: Compare generated PDF screenshots
2. **Content Validation**: Parse PDF/DOCX and validate text content
3. **Performance Benchmarks**: Track export generation time
4. **Format Validation**: Use PDF/DOCX parsers to validate structure
5. **Cross-platform Testing**: Run real tests on Windows, macOS, Linux

## Related Documentation

- Export Implementation: `src/lib/export.ts`
- Export Routes: `src/app/api/manuscripts/[id]/export/`
- Test Fixtures: `tests/e2e/fixtures/`
- Playwright Config: `playwright.config.ts`
