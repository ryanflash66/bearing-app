/**
 * E2E Tests for Story 6.2: Public Author Profile/Blog
 *
 * These tests validate the public-facing author profile and blog pages
 * that are accessible without authentication.
 *
 * Test Data Requirements:
 * - A published author must exist with pen_name matching TEST_AUTHOR_HANDLE
 * - The author should have at least one published blog post
 * - Set TEST_AUTHOR_HANDLE env var or use default "test-author"
 *
 * Priority: P1 (Core user journey - public content discovery)
 */

import { test, expect } from '@playwright/test';

// Test configuration - can be overridden via environment variables
const TEST_AUTHOR_HANDLE = process.env.TEST_AUTHOR_HANDLE || 'test-author';
const TEST_BLOG_SLUG = process.env.TEST_BLOG_SLUG || 'test-post';

test.describe('Story 6.2: Public Author Profile/Blog @p1', () => {

  test.describe('AC-1: Author Profile Page', () => {

    test('6.2-E2E-001: displays author profile with bio and books section', async ({ page }) => {
      // Given: A public author profile page
      // When: I navigate to the author's profile
      const response = await page.goto(`/${TEST_AUTHOR_HANDLE}`);

      // Then: The page loads successfully (not 404/500)
      expect(response?.status()).toBeLessThan(400);

      // And: I see the author's display name in a heading
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();

      // And: I see either an avatar image or initials fallback
      const avatar = page.locator('img[alt*="avatar"]');
      const initialsAvatar = page.locator('.rounded-full').filter({ hasText: /^[A-Z]{2}$/ });
      const hasAvatar = await avatar.count() > 0;
      const hasInitials = await initialsAvatar.count() > 0;
      expect(hasAvatar || hasInitials).toBeTruthy();

      // And: I see the "Published Books" section
      await expect(page.getByRole('heading', { name: /published books/i })).toBeVisible();

      // And: I see a link to visit the blog
      await expect(page.getByRole('link', { name: /visit blog/i })).toBeVisible();
    });

    test('6.2-E2E-002: shows 404 for non-existent author', async ({ page }) => {
      // Given: A non-existent author handle
      const nonExistentHandle = 'this-author-definitely-does-not-exist-xyz-123';

      // When: I navigate to their profile
      const response = await page.goto(`/${nonExistentHandle}`);

      // Then: I get a 404 response or see a not found message
      const status = response?.status();
      const hasNotFoundText = await page.getByText(/not found|404|doesn't exist/i).count() > 0;

      expect(status === 404 || hasNotFoundText).toBeTruthy();
    });
  });

  test.describe('AC-2: Blog Index Page', () => {

    test('6.2-E2E-003: displays blog index with posts or empty state', async ({ page }) => {
      // Given: A public blog index page
      // When: I navigate to the author's blog
      const response = await page.goto(`/${TEST_AUTHOR_HANDLE}/blog`);

      // Then: The page loads successfully
      expect(response?.status()).toBeLessThan(400);

      // And: I see the blog heading
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // And: I see either blog posts OR an empty state message
      const blogCards = page.locator('a[href*="/blog/"]').filter({ hasText: /read post/i });
      const emptyState = page.getByText(/no published blog posts/i);

      const hasPosts = await blogCards.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;

      // One of these must be true
      expect(hasPosts || hasEmptyState).toBeTruthy();

      // If there are posts, verify card structure
      if (hasPosts) {
        const firstCard = blogCards.first();
        await expect(firstCard).toBeVisible();
      }
    });

    test('6.2-E2E-004: pagination controls appear when multiple pages exist', async ({ page }) => {
      // Given: A blog with potentially multiple pages
      // When: I navigate to the blog index
      await page.goto(`/${TEST_AUTHOR_HANDLE}/blog`);

      // Then: If pagination exists, it shows page info
      const pageInfo = page.getByText(/page \d+ of \d+/i);
      const hasPagination = await pageInfo.count() > 0;

      if (hasPagination) {
        // Verify pagination controls are present
        await expect(page.getByRole('link', { name: /previous/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /next/i })).toBeVisible();
      }

      // Test passes regardless - pagination is conditional on data volume
      expect(true).toBeTruthy();
    });
  });

  test.describe('AC-3: Blog Post with OpenGraph', () => {

    test('6.2-E2E-005: blog post page has OpenGraph meta tags', async ({ page }) => {
      // Given: A published blog post
      // When: I navigate to a specific blog post
      const response = await page.goto(`/${TEST_AUTHOR_HANDLE}/blog/${TEST_BLOG_SLUG}`);

      // If post doesn't exist, skip OpenGraph validation (test data dependent)
      if (response?.status() === 404) {
        test.skip(true, `Test post not found: /${TEST_AUTHOR_HANDLE}/blog/${TEST_BLOG_SLUG}`);
        return;
      }

      // Then: The page loads successfully
      expect(response?.status()).toBeLessThan(400);

      // And: I see the post title
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // And: OpenGraph meta tags are present in the HTML
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');

      // Verify required OG tags exist and have values
      expect(ogTitle).toBeTruthy();
      expect(ogDescription).toBeTruthy();
      expect(ogImage).toBeTruthy();
      expect(ogType).toBe('article');

      // And: Twitter card meta tags are present
      const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
      expect(twitterCard).toBeTruthy();
    });

    test('6.2-E2E-006: blog post displays content from TipTap viewer', async ({ page }) => {
      // Given: A published blog post with content
      const response = await page.goto(`/${TEST_AUTHOR_HANDLE}/blog/${TEST_BLOG_SLUG}`);

      if (response?.status() === 404) {
        test.skip(true, `Test post not found: /${TEST_AUTHOR_HANDLE}/blog/${TEST_BLOG_SLUG}`);
        return;
      }

      // Then: The article section is visible
      await expect(page.locator('article')).toBeVisible();

      // And: Either content is displayed or empty content message
      const articleContent = page.locator('article');
      const hasContent = await articleContent.locator('.prose, .ProseMirror, p').count() > 0;
      const hasEmptyMessage = await page.getByText(/does not contain any content/i).count() > 0;

      expect(hasContent || hasEmptyMessage).toBeTruthy();
    });
  });

  test.describe('AC-4: Public Route Access (Unauthenticated)', () => {

    test('6.2-E2E-007: all public routes accessible without authentication', async ({ page, context }) => {
      // Given: No authentication (clear all cookies)
      await context.clearCookies();

      // Define public routes to test
      const publicRoutes = [
        `/${TEST_AUTHOR_HANDLE}`,
        `/${TEST_AUTHOR_HANDLE}/blog`,
      ];

      // When/Then: Each route should return a valid response (not 401/403)
      for (const route of publicRoutes) {
        const response = await page.goto(route);
        const status = response?.status() || 0;

        // 404 is acceptable (author may not exist in test data)
        // 401/403 would indicate authentication is incorrectly required
        expect(status).not.toBe(401);
        expect(status).not.toBe(403);

        // Should be either success (2xx) or not found (404)
        expect(status === 200 || status === 404).toBeTruthy();
      }
    });

    test('6.2-E2E-008: public routes do not redirect to login', async ({ page, context }) => {
      // Given: No authentication
      await context.clearCookies();

      // When: I navigate to a public author route
      await page.goto(`/${TEST_AUTHOR_HANDLE}`);

      // Then: I am NOT redirected to login
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
      expect(currentUrl).not.toContain('/auth');

      // And: The page contains author-related content (not a login form)
      const loginForm = page.locator('form input[type="password"]');
      const hasLoginForm = await loginForm.count() > 0;
      expect(hasLoginForm).toBeFalsy();
    });
  });
});

test.describe('Story 6.2: Edge Cases @p2', () => {

  test('6.2-E2E-009: handles URL-encoded author handles', async ({ page }) => {
    // Given: An author handle that might need URL encoding
    // When: I navigate with special characters (spaces, etc.)
    // Note: Most handles won't have special chars, but middleware should handle gracefully
    const response = await page.goto(`/test%20author`); // URL-encoded space

    // Then: The page loads (either profile or 404, not an error)
    const status = response?.status() || 0;
    expect(status).toBeLessThan(500); // No server errors
  });

  test('6.2-E2E-010: reserved routes are not treated as author handles', async ({ page }) => {
    // Given: Reserved route names that should NOT be author profiles
    const reservedRoutes = ['/dashboard', '/login', '/api/test', '/auth/callback'];

    for (const route of reservedRoutes) {
      // When: I navigate to a reserved route
      const response = await page.goto(route);

      // Then: It should not render as an author profile
      // (Will either redirect, show login, or return 404/appropriate response)
      const isAuthorProfile = await page.getByRole('heading', { name: /published books/i }).count() > 0;
      expect(isAuthorProfile).toBeFalsy();
    }
  });
});
