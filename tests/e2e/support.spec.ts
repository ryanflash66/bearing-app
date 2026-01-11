
import { test, expect } from '@playwright/test';

test.describe('Support Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'password123';
    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create a support ticket and reply', async ({ page }) => {
    // Navigate to Support
    await page.goto('/dashboard/support');
    
    // Verify header
    await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible();

    // Click Contact Support
    await page.getByRole('link', { name: 'Contact Support' }).click();
    await expect(page).toHaveURL(/\/dashboard\/support\/create/);
    
    // Fill form
    const subject = `E2E Test Ticket ${Date.now()}`;
    await page.fill('input[name="subject"]', subject);
    await page.fill('textarea[name="message"]', 'This is a test message form E2E.');
    
    // Submit
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    
    // Wait for redirect back to list
    await expect(page).toHaveURL(/\/dashboard\/support$/);
    
    // Verify ticket in list
    // Use first() if multiple matches, but unique subject ensures uniqueness
    await expect(page.getByText(subject)).toBeVisible();
    
    // Go to details
    await page.getByText(subject).click();
    
    // Check detail page
    await expect(page.getByRole('heading', { level: 3, name: subject })).toBeVisible();
    
    // Reply
    await page.fill('textarea[name="message"]', 'Reply from user');
    await page.getByRole('button', { name: 'Send' }).click();
    
    // Verify reply
    await expect(page.getByText('Reply from user')).toBeVisible();
  });
});
