import { test, expect } from './fixtures/auth.fixture';

test.describe('Cover Generator E2E', () => {
  test('should allow generating a cover', async ({ authenticatedPage: page }) => {
    // 1. Navigate to Dashboard
    await page.goto('/dashboard/manuscripts');
    
    // 2. Select the first manuscript (assuming one exists)
    // We wait for the list to load
    const firstManuscript = page.locator('a[href^="/dashboard/manuscripts/"]').first();
    await expect(firstManuscript).toBeVisible({ timeout: 15000 });
    const href = await firstManuscript.getAttribute('href'); 
    
    if (!href) {
      throw new Error('No manuscript found on dashboard');
    }

    // 3. Navigate to Marketing
    const marketingUrl = `${href}/marketing`;
    await page.goto(marketingUrl);
    
    // 4. Switch to Cover Lab tab
    await page.click('button:has-text("Cover Lab")');
    await expect(page.locator('text=Cover Lab')).toBeVisible();
    await expect(page.locator('text=Generate AI cover concepts')).toBeVisible();
    
    // 5. Intercept API calls to mock the generation process
    await page.route('**/api/manuscripts/*/covers/jobs', async route => {
      await route.fulfill({ 
        status: 202, 
        contentType: 'application/json',
        body: JSON.stringify({ job_id: 'job-mock-123' }) 
      });
    });
    
    // Mock polling responses
    let pollCount = 0;
    await page.route('**/api/covers/jobs/job-mock-123', async route => {
      pollCount++;
      if (pollCount <= 1) {
        // First poll: Queued/Running
        await route.fulfill({ 
            status: 200, 
            contentType: 'application/json',
            body: JSON.stringify({ 
              id: 'job-mock-123',
              status: 'running', 
              images: [],
              completed_images: [] 
            }) 
        });
      } else {
        // Subsequent polls: Completed
        await route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: JSON.stringify({ 
            id: 'job-mock-123',
            status: 'completed', 
            images: [
              { url: 'https://via.placeholder.com/400x600.webp?text=Cover1', safety_status: 'safe', seed: 123 },
              { url: 'https://via.placeholder.com/400x600.webp?text=Cover2', safety_status: 'safe', seed: 124 }
            ],
            completed_images: [
              { url: 'https://via.placeholder.com/400x600.webp?text=Cover1', safety_status: 'safe', seed: 123 },
              { url: 'https://via.placeholder.com/400x600.webp?text=Cover2', safety_status: 'safe', seed: 124 }
            ],
            retry_after: null
          }) 
        });
      }
    });

    // 6. Fill form
    await page.locator('label', { hasText: 'Genre' }).locator('select').selectOption({ index: 1 });
    await page.locator('label', { hasText: 'Mood' }).locator('select').selectOption({ index: 1 });
    await page.locator('label', { hasText: 'Art Style' }).locator('select').selectOption({ index: 0 }); // Cinematic
    
    await page.fill('textarea', 'A mysterious forest with glowing trees and a dark tower in the distance.');
    
    // 7. Click Generate
    // Note: The button text changes based on state, initially "Generate"
    const generateButton = page.locator('button:has-text("Generate")').first();
    await expect(generateButton).toBeEnabled();
    await generateButton.click();
    
    // 8. Verify Result
    // Should show "Cover generation completed" or similar status
    await expect(page.locator('text=Cover generation completed')).toBeVisible({ timeout: 10000 });
    
    // Check if images are displayed
    const images = page.locator('img[alt*="A mysterious forest"]');
    await expect(images.first()).toBeVisible();
    expect(await images.count()).toBeGreaterThan(0);
  });
});
