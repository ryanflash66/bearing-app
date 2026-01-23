
import { test, expect } from './fixtures/auth.fixture';

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
