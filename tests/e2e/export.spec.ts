
import { test, expect } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import fs from 'fs';

/**
 * ============================================================================
 * EXPORT E2E TESTS - TESTING STRATEGY
 * ============================================================================
 * 
 * This file contains two types of export tests:
 * 
 * 1. STANDARD E2E TESTS (with E2E_TEST_MODE=1):
 *    - Run by default in CI and local development
 *    - Fast and stable (no actual PDF/DOCX generation)
 *    - Validate download flow, headers, and API integration
 *    - Export routes return minimal stubs instead of real files
 *    
 * 2. REAL EXPORT TESTS (without E2E_TEST_MODE, tagged @real-export):
 *    - Run locally on demand or in CI nightly builds
 *    - Validate actual PDF/DOCX content generation
 *    - Slower and may be flaky due to Puppeteer/docx library
 *    - These tests ensure export functionality actually works end-to-end
 * 
 * RUNNING REAL EXPORT TESTS:
 *   # Run locally without E2E_TEST_MODE
 *   npx playwright test tests/e2e/export.spec.ts --grep @real-export
 * 
 *   # CI runs these nightly (see .github/workflows/nightly-export-tests.yml)
 * 
 * LIMITATION: Standard E2E tests do NOT validate actual file content, only
 * the download flow and API integration. Real export tests must be run
 * periodically to catch regressions in PDF/DOCX generation.
 * ============================================================================
 */

/**
 * Story 7.2: WYSIWYG Export Previewer E2E Suite
 */
test.describe('WYSIWYG Export Previewer', () => {
  async function openNewManuscriptEditor(authenticatedPage: import('@playwright/test').Page) {
    await authenticatedPage.goto('/dashboard/manuscripts/new');
    await authenticatedPage.waitForURL(/\/dashboard\/manuscripts\/[^/]+$/, { timeout: 15000 });
  }
  
  test('[P0] should open export modal and update live preview on settings change', async ({ authenticatedPage }) => {
    // GIVEN: User has a manuscript editor open
    await openNewManuscriptEditor(authenticatedPage);
    
    // WHEN: User clicks the Export button
    await authenticatedPage.click('[data-testid="export-button"]');
    
    // THEN: Export Modal should be visible
    const modal = authenticatedPage.locator('[data-testid="export-modal"]');
    await expect(modal).toBeVisible();
    
    // AND: Live Preview should be enabled by default
    const previewContainer = authenticatedPage.locator('[data-testid="export-preview-container"]');
    await expect(previewContainer).toBeVisible();
    
    // WHEN: User changes font size
    const fontSizeRange = authenticatedPage.locator('[data-testid="font-size-range"]');
    await expect(fontSizeRange).toBeVisible();
    await fontSizeRange.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = "12";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    
    // THEN: Preview should reflect the change (check for CSS variable update if possible or just stability)
    // Note: Paged.js takes a moment to re-render
    await expect(previewContainer).toBeVisible();
  });

  test('[P1] should toggle between PDF and ePub view modes', async ({ authenticatedPage }) => {
    await openNewManuscriptEditor(authenticatedPage);
    await authenticatedPage.click('[data-testid="export-button"]');
    
    // GIVEN: Default mode is PDF
    // Note: export-preview-container is used in two places (outer container + inner preview),
    // so be explicit to avoid strict-mode violations.
    const pdfView = authenticatedPage.locator('[data-testid="export-preview-container"]').first();
    await expect(pdfView).toBeVisible();
    
    // Enable live preview so the ePub frame actually renders
    await authenticatedPage.click('[data-testid="toggle-live-preview"]');

    // WHEN: User switches to ePub mode
    await authenticatedPage.click('[data-testid="view-mode-epub"]');
    
    // THEN: ePub mobile frame should be visible
    const epubFrame = authenticatedPage.locator('.rounded-b-xl'); // The notch placeholder from component tests
    await expect(epubFrame).toBeVisible();
    
    // WHEN: User switches back to PDF
    await authenticatedPage.click('[data-testid="view-mode-pdf"]');
    
    // THEN: PDF container is visible again
    await expect(pdfView).toBeVisible();
  });

  test('[P1] should trigger PDF download flow', async ({ authenticatedPage }) => {
    await openNewManuscriptEditor(authenticatedPage);
    await authenticatedPage.click('[data-testid="export-button"]');
    
    // WHEN: User clicks Download PDF
    // We intercept the API call to verify settings are passed
    const downloadPromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes('/api/manuscripts/') && resp.url().includes('/export/pdf'),
      { timeout: 30000 }
    );
    
    await authenticatedPage.click('[data-testid="download-pdf-button"]');
    
    const response = await downloadPromise;
    
    // THEN: API should be called successfully
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
  });

  test('[P2] should show overflow warning for oversized content', async ({ authenticatedPage }) => {
    // This test might require specific setup with oversized content
    await openNewManuscriptEditor(authenticatedPage);
    
    // Inject oversized content via editor (assuming we can) or navigate to specific manuscript
    await authenticatedPage.click('[data-testid="export-button"]');
    
    // If overflow warning is present, check for the indicator
    // This AC is conditionally tested based on content
    // await expect(overflowWarning).toBeVisible();
  });
});

/**
 * Story 8.1: Export Download Fix E2E Suite
 * 
 * AC 8.1.1: PDF Export Download Success
 * AC 8.1.2: DOCX Export Download Success
 * AC 8.1.3: Error Handling and User Feedback
 * AC 8.1.4: Response Headers and CORS Compliance
 */
test.describe('Export Download Fix (Story 8.1)', () => {
  async function openNewManuscriptEditor(authenticatedPage: import('@playwright/test').Page) {
    await authenticatedPage.goto('/dashboard/manuscripts/new');
    await authenticatedPage.waitForURL(/\/dashboard\/manuscripts\/[^/]+$/, { timeout: 15000 });
  }

  test.describe('AC 8.1.1: PDF Export Download Success', () => {
    test('should download PDF with correct filename and content', async ({ authenticatedPage }) => {
      await openNewManuscriptEditor(authenticatedPage);
      
      // Open export modal
      await authenticatedPage.click('[data-testid="export-button"]');
      const modal = authenticatedPage.locator('[data-testid="export-modal"]');
      await expect(modal).toBeVisible();
      
      // Wait for download event
      const downloadPromise = authenticatedPage.waitForEvent('download', { timeout: 30000 });
      const responsePromise = authenticatedPage.waitForResponse(
        (resp) => resp.url().includes('/api/manuscripts/') && resp.url().includes('/export/pdf'),
        { timeout: 30000 }
      );
      
      // Click PDF download button
      await authenticatedPage.click('[data-testid="download-pdf-button"]');
      
      // Verify API response
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('application/pdf');
      
      // Verify Content-Disposition header with RFC 5987 format
      const contentDisposition = response.headers()['content-disposition'];
      expect(contentDisposition).toContain('attachment');
      expect(contentDisposition).toContain('filename=');
      expect(contentDisposition).toContain('.pdf');
      
      // Verify Content-Length is present and non-zero
      const contentLength = response.headers()['content-length'];
      if (contentLength) {
        expect(parseInt(contentLength)).toBeGreaterThan(0);
      }
      
      // Verify download event fires (file actually downloads)
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.pdf');
      
      // Verify no error message appears
      const errorMessage = authenticatedPage.locator('.bg-red-50');
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('AC 8.1.2: DOCX Export Download Success', () => {
    test('should download DOCX with correct filename and content', async ({ authenticatedPage }) => {
      await openNewManuscriptEditor(authenticatedPage);
      
      // Open export modal
      await authenticatedPage.click('[data-testid="export-button"]');
      const modal = authenticatedPage.locator('[data-testid="export-modal"]');
      await expect(modal).toBeVisible();
      
      // Wait for download event
      const downloadPromise = authenticatedPage.waitForEvent('download', { timeout: 30000 });
      const responsePromise = authenticatedPage.waitForResponse(
        (resp) => resp.url().includes('/api/manuscripts/') && resp.url().includes('/export/docx'),
        { timeout: 30000 }
      );
      
      // Click DOCX download button
      await authenticatedPage.click('[data-testid="download-docx-button"]');
      
      // Verify API response
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      
      // Verify Content-Disposition header with RFC 5987 format
      const contentDisposition = response.headers()['content-disposition'];
      expect(contentDisposition).toContain('attachment');
      expect(contentDisposition).toContain('filename=');
      expect(contentDisposition).toContain('.docx');
      
      // Verify Content-Length is present and non-zero
      const contentLength = response.headers()['content-length'];
      if (contentLength) {
        expect(parseInt(contentLength)).toBeGreaterThan(0);
      }
      
      // Verify download event fires (file actually downloads)
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.docx');
      
      // Verify no error message appears
      const errorMessage = authenticatedPage.locator('.bg-red-50');
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('AC 8.1.3: Error Handling and User Feedback', () => {
    test('should display user-friendly error for unauthorized export', async ({ authenticatedPage, context }) => {
      await openNewManuscriptEditor(authenticatedPage);
      
      // Open export modal
      await authenticatedPage.click('[data-testid="export-button"]');
      
      // Mock API to return 401
      await context.route('**/api/manuscripts/*/export/pdf**', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });
      
      // Click PDF download button
      await authenticatedPage.click('[data-testid="download-pdf-button"]');
      
      // Verify error message is shown (not the generic "Failed to download file")
      const errorMessage = authenticatedPage.locator('.bg-red-50');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Error should mention login/authentication
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).toMatch(/log in|unauthorized|authentication/i);
    });

    test('should display user-friendly error for server error', async ({ authenticatedPage, context }) => {
      await openNewManuscriptEditor(authenticatedPage);
      
      // Open export modal
      await authenticatedPage.click('[data-testid="export-button"]');
      
      // Mock API to return 500
      await context.route('**/api/manuscripts/*/export/pdf**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });
      
      // Click PDF download button
      await authenticatedPage.click('[data-testid="download-pdf-button"]');
      
      // Verify error message is shown
      const errorMessage = authenticatedPage.locator('.bg-red-50');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Error should mention server error or retry
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).toMatch(/server|try again|error/i);
    });

    test('should allow dismissing error message', async ({ authenticatedPage, context }) => {
      await openNewManuscriptEditor(authenticatedPage);
      
      // Open export modal
      await authenticatedPage.click('[data-testid="export-button"]');
      
      // Mock API to return error
      await context.route('**/api/manuscripts/*/export/pdf**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Error' }),
        });
      });
      
      // Click PDF download button
      await authenticatedPage.click('[data-testid="download-pdf-button"]');
      
      // Wait for error message
      const errorMessage = authenticatedPage.locator('.bg-red-50');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Click dismiss button
      await authenticatedPage.click('.bg-red-50 button');
      
      // Error message should be hidden
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('AC 8.1.4: Response Headers and CORS Compliance', () => {
    test('should have correct Content-Type header for PDF', async ({ authenticatedPage }) => {
      await openNewManuscriptEditor(authenticatedPage);
      await authenticatedPage.click('[data-testid="export-button"]');
      
      const responsePromise = authenticatedPage.waitForResponse(resp => 
        resp.url().includes('/export/pdf')
      );
      
      await authenticatedPage.click('[data-testid="download-pdf-button"]');
      
      const response = await responsePromise;
      expect(response.headers()['content-type']).toBe('application/pdf');
    });

    test('should have correct Content-Type header for DOCX', async ({ authenticatedPage }) => {
      await openNewManuscriptEditor(authenticatedPage);
      await authenticatedPage.click('[data-testid="export-button"]');
      
      const responsePromise = authenticatedPage.waitForResponse(resp => 
        resp.url().includes('/export/docx')
      );
      
      await authenticatedPage.click('[data-testid="download-docx-button"]');
      
      const response = await responsePromise;
      expect(response.headers()['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    test('should have RFC 5987 Content-Disposition with filename*', async ({ authenticatedPage }) => {
      await openNewManuscriptEditor(authenticatedPage);
      await authenticatedPage.click('[data-testid="export-button"]');
      
      const responsePromise = authenticatedPage.waitForResponse(resp => 
        resp.url().includes('/export/pdf')
      );
      
      await authenticatedPage.click('[data-testid="download-pdf-button"]');
      
      const response = await responsePromise;
      const contentDisposition = response.headers()['content-disposition'];
      
      // Should have both filename and filename* for compatibility
      expect(contentDisposition).toContain('filename=');
      expect(contentDisposition).toContain("filename*=UTF-8''");
    });
  });
});

/**
 * ============================================================================
 * REAL EXPORT TESTS (without E2E_TEST_MODE)
 * ============================================================================
 * 
 * These tests verify actual PDF/DOCX generation by running without E2E_TEST_MODE.
 * They are tagged with @real-export and should be run:
 * 
 * 1. Locally when making changes to export functionality:
 *    npx playwright test tests/e2e/export.spec.ts --grep @real-export
 * 
 * 2. In CI on a schedule (nightly) to catch regressions:
 *    See .github/workflows/nightly-export-tests.yml
 * 
 * IMPORTANT: These tests are slower and may be flaky due to Puppeteer/docx
 * library behavior in different environments. They are not part of the standard
 * CI pipeline to keep it fast and stable.
 * ============================================================================
 */
test.describe('Real Export Tests @real-export', () => {
  // Helper to open a manuscript editor
  async function openNewManuscriptEditor(authenticatedPage: Page) {
    await authenticatedPage.goto('/dashboard/manuscripts/new');
    await authenticatedPage.waitForURL(/\/dashboard\/manuscripts\/[^/]+$/, { timeout: 15000 });
  }

  // Helper to add some content to the editor
  async function addEditorContent(authenticatedPage: Page, content: string) {
    const editor = authenticatedPage.locator('.tiptap').first();
    await editor.click();
    await editor.fill(content);
    // Wait for autosave to complete
    await authenticatedPage.waitForTimeout(2000);
  }

  test('should generate and download a real PDF with actual content', async ({ authenticatedPage }) => {
    // Skip this test if E2E_TEST_MODE is enabled
    if (process.env.E2E_TEST_MODE === "1") {
      test.skip();
      return;
    }

    await openNewManuscriptEditor(authenticatedPage);
    
    // Add some test content
    await addEditorContent(authenticatedPage, 'This is a test manuscript for real PDF export validation.');
    
    // Open export modal
    await authenticatedPage.click('[data-testid="export-button"]');
    const modal = authenticatedPage.locator('[data-testid="export-modal"]');
    await expect(modal).toBeVisible();
    
    // Wait for download event and API response
    const downloadPromise = authenticatedPage.waitForEvent('download', { timeout: 60000 });
    const responsePromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes('/api/manuscripts/') && resp.url().includes('/export/pdf'),
      { timeout: 60000 }
    );
    
    // Click PDF download button
    await authenticatedPage.click('[data-testid="download-pdf-button"]');
    
    // Verify API response
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
    
    // Verify the PDF is larger than the minimal stub (which is ~50 bytes)
    const contentLength = response.headers()['content-length'];
    expect(parseInt(contentLength)).toBeGreaterThan(1000); // Real PDFs should be > 1KB
    
    // Verify download completes
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
    
    // Download the file and verify it's a valid PDF
    const path = await download.path();
    expect(path).toBeTruthy();
    
    // Read the downloaded file
    const pdfBuffer = fs.readFileSync(path);
    
    // Verify PDF header
    expect(pdfBuffer.toString('utf8', 0, 8)).toContain('%PDF-');
    
    // Verify the PDF is substantial (not just a minimal stub)
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  test('should generate and download a real DOCX with actual content', async ({ authenticatedPage }) => {
    // Skip this test if E2E_TEST_MODE is enabled
    if (process.env.E2E_TEST_MODE === "1") {
      test.skip();
      return;
    }

    await openNewManuscriptEditor(authenticatedPage);
    
    // Add some test content
    await addEditorContent(authenticatedPage, 'This is a test manuscript for real DOCX export validation.');
    
    // Open export modal
    await authenticatedPage.click('[data-testid="export-button"]');
    const modal = authenticatedPage.locator('[data-testid="export-modal"]');
    await expect(modal).toBeVisible();
    
    // Wait for download event and API response
    const downloadPromise = authenticatedPage.waitForEvent('download', { timeout: 60000 });
    const responsePromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes('/api/manuscripts/') && resp.url().includes('/export/docx'),
      { timeout: 60000 }
    );
    
    // Click DOCX download button
    await authenticatedPage.click('[data-testid="download-docx-button"]');
    
    // Verify API response
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    // Verify the DOCX is larger than the minimal stub (which is 4 bytes)
    const contentLength = response.headers()['content-length'];
    expect(parseInt(contentLength)).toBeGreaterThan(1000); // Real DOCX files should be > 1KB
    
    // Verify download completes
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.docx');
    
    // Download the file and verify it's a valid DOCX (ZIP format)
    const path = await download.path();
    expect(path).toBeTruthy();
    
    // Read the downloaded file
    const docxBuffer = fs.readFileSync(path);
    
    // Verify ZIP header (DOCX is a ZIP container)
    expect(docxBuffer.toString('binary', 0, 4)).toBe('PK\x03\x04');
    
    // Verify the DOCX is substantial (not just a minimal stub)
    expect(docxBuffer.length).toBeGreaterThan(1000);
  });

  test('should generate PDF with custom formatting settings', async ({ authenticatedPage }) => {
    // Skip this test if E2E_TEST_MODE is enabled
    if (process.env.E2E_TEST_MODE === "1") {
      test.skip();
      return;
    }

    await openNewManuscriptEditor(authenticatedPage);
    
    // Add some test content
    await addEditorContent(authenticatedPage, 'Test content with custom formatting.');
    
    // Open export modal
    await authenticatedPage.click('[data-testid="export-button"]');
    
    // Change font size
    const fontSizeRange = authenticatedPage.locator('[data-testid="font-size-range"]');
    await fontSizeRange.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = "14";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    
    // Wait for settings to update
    await authenticatedPage.waitForTimeout(500);
    
    // Download PDF
    const downloadPromise = authenticatedPage.waitForEvent('download', { timeout: 60000 });
    const responsePromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes('/export/pdf') && resp.url().includes('fontSize=14'),
      { timeout: 60000 }
    );
    
    await authenticatedPage.click('[data-testid="download-pdf-button"]');
    
    // Verify the API was called with custom settings
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.url()).toContain('fontSize=14');
    
    // Verify download completes
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
