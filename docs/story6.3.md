# Story 6.3: Admin Blog Moderation

**Description**
As an Admin,
I want to moderate user-generated blog content,
So that I can remove offensive or illegal material from the platform.

**Acceptance Criteria**
*   **Given** the Admin Dashboard
    *   **Then** I can see a "Content Moderation" queue (flagged posts).
*   **Given** a specific post
    *   **When** I select "Takedown"
    *   **Then** the post status changes to "Suspended" and is 404'd for the public.
    *   **And** the author receives an email notification.
*   **Given** an automated safety flag (e.g., OpenAI Moderation API)
    *   **Then** the post is auto-held for review before publishing (if high confidence) or flagged post-publish.

**Effort:** 16h
**Dependencies:** Epic 4 (Admin Dash), Story 6.1
**Status:** Planned
