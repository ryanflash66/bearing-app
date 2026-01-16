# Story 6.2: Public Author Profile/Blog

**Description**
As a Reader,
I want to view an author's public profile and blog,
So that I can learn more about them and read their latest updates.

**Acceptance Criteria**
*   **Given** I navigate to `/[author_handle]`
    *   **Then** I see the author's bio, avatar, and list of published books.
*   **Given** I navigate to `/[author_handle]/blog`
    *   **Then** I see a paginated list of published blog posts.
*   **Given** a specific blog post
    *   **Then** the page is server-side rendered (SSR) with correct OpenGraph metadata for social sharing.
*   **Given** I am a logged-out user
    *   **Then** I can still access these public pages (Public Route).

**Effort:** 24h
**Dependencies:** Story 6.1 (Content)
**Status:** Planned
