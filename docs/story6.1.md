# Story 6.1: Blog Management (CMS)

**Description**
As an Author,
I want a dashboard to create, edit, and publish blog posts,
So that I can build an audience and share updates about my writing journey.

**Acceptance Criteria**
*   **Given** the "Marketing > Blog" dashboard
    *   **When** I click "New Post"
    *   **Then** a rich-text editor (TipTap) opens with fields for Title, Slug, and Content.
*   **Given** a drafted post
    *   **When** I click "Save Draft"
    *   **Then** the post is saved but not visible publicly.
*   **Given** a ready post
    *   **When** I click "Publish"
    *   **Then** the post becomes visible at `/[author_handle]/blog/[slug]`.
*   **Given** the blog list view
    *   **Then** I can see status (Draft/Published) and view metrics (views/reads).

**Effort:** 32h
**Dependencies:** Epic 1 (Auth), Epic 2 (TipTap)
**Status:** Planned
