import { test, expect } from '@playwright/test';

test.describe('Voice-to-Text Dictation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'password123';
    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Mock SpeechRecognition API
    await page.addInitScript(() => {
      class MockSpeechRecognition extends EventTarget {
        continuous = false;
        interimResults = false;
        lang = 'en-US';
        
        constructor() {
          super();
          (window as any).lastRecognition = this;
        }
        
        start() {
          setTimeout(() => {
            const startEvent = new Event('start');
            this.dispatchEvent(startEvent);
            if ((this as any).onstart) (this as any).onstart();
          }, 10);
        }
        
        stop() {
          setTimeout(() => {
            const endEvent = new Event('end');
            this.dispatchEvent(endEvent);
            if ((this as any).onend) (this as any).onend();
          }, 10);
        }
      }

      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    });
  });

  test('should perform full dictation flow and trigger autosave', async ({ page }) => {
    // Navigate to a manuscript
    await page.goto('/dashboard');
    
    // Find first manuscript link and click
    const manuscriptLink = page.locator('a[href^="/dashboard/manuscripts/"]').first();
    await manuscriptLink.click();
    
    // Wait for editor to load
    await expect(page.locator('.tiptap')).toBeVisible();

    // Check if dictation button is visible
    const dictateButton = page.getByRole('button', { name: /Dictate/i });
    await expect(dictateButton).toBeVisible();

    // 1. Start dictation
    await dictateButton.click();
    await expect(page.getByText(/Listening.../i)).toBeVisible();
    await expect(dictateButton).toHaveClass(/animate-pulse/);

    // 2. Simulate interim result
    await page.evaluate(() => {
      const recognition = (window as any).lastRecognition;
      const event = new Event('result') as any;
      event.resultIndex = 0;
      event.results = [[{ transcript: "Interim voice text" }]];
      event.results[0].isFinal = false;
      if (recognition.onresult) recognition.onresult(event);
    });

    // Check for interim text display in header
    await expect(page.getByText("Interim voice text")).toBeVisible();

    // 3. Simulate final result
    await page.evaluate(() => {
      const recognition = (window as any).lastRecognition;
      const event = new Event('result') as any;
      event.resultIndex = 0;
      event.results = [[{ transcript: "Final dictated sentence." }]];
      event.results[0].isFinal = true;
      if (recognition.onresult) recognition.onresult(event);
    });

    // Interim text should disappear from header
    await expect(page.getByText("Interim voice text")).not.toBeVisible();

    // Final text should appear in editor
    await expect(page.locator('.tiptap')).toContainText("Final dictated sentence.");

    // 4. Verify autosave trigger
    // The AutosaveIndicator should change state from "Saved" to "Saving..." and back to "Saved"
    // Note: Debounce is 5 seconds, so we might need to wait or check for "Saving..."
    await expect(page.getByText(/Saving/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Saved/i)).toBeVisible({ timeout: 10000 });

    // 5. Stop dictation
    await dictateButton.click();
    await expect(page.getByText(/Listening.../i)).not.toBeVisible();
    await expect(dictateButton).not.toHaveClass(/animate-pulse/);
  });

  test('should handle dictation errors', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('a[href^="/dashboard/manuscripts/"]').first().click();
    
    const dictateButton = page.getByRole('button', { name: /Dictate/i });
    await dictateButton.click();

    // Simulate error
    await page.evaluate(() => {
      const recognition = (window as any).lastRecognition;
      const event = new Event('error') as any;
      event.error = "not-allowed";
      if (recognition.onerror) recognition.onerror(event);
    });

    // Check for error UI
    await expect(page.getByText(/Dictation Error: not-allowed/i)).toBeVisible();
    await expect(dictateButton).not.toHaveClass(/animate-pulse/);
  });
});