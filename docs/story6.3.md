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
**Status:** ready-for-dev

## Tasks
- [ ] **Marketplace Hotfix (Priority)**
    - [ ] Remove/Hide prices from `ServiceCard` and Marketplace UI in `src/app/dashboard/marketplace`.
- [ ] **Moderation Queue UI**
    - [ ] Create `/dashboard/admin/moderation` page.
    - [ ] Fetch all posts (sort by reported/flagged first).
    - [ ] Add "Takedown" and "Approve" actions.
- [ ] **Takedown Logic**
    - [ ] Implement `suspend_post` RPC function (set status='suspended').
    - [ ] Update public middleware to block 'suspended' posts (return 404).
- [ ] **Automated Safety (Optional/Bonus)**
    - [ ] Integrate OpenAI Moderation API on `blog_post` insert/update.

## Dev Agent Record

### File List
- `src/app/dashboard/marketplace/page.tsx`
- `src/components/marketplace/ServiceCard.tsx`
- `src/app/dashboard/admin/moderation/page.tsx`
- `supabase/migrations/*_moderation.sql`

### Change Log
- **2026-01-16**: Added Marketplace Hotfix task per user request. Initialized moderation tasks.
