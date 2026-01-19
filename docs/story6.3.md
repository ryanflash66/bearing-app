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
*   **Given** an automated safety flag (e.g., OpenAI Moderation API) **(Optional/Bonus)**
    *   **Then** the post is auto-held for review before publishing (if high confidence) or flagged post-publish.

**Effort:** 16h
**Dependencies:** Epic 4 (Admin Dash), Story 6.1
**Status:** done

## Tasks
- [x] **Marketplace Hotfix (Priority)**
    - [x] Remove/Hide prices from `ServiceCard` and Marketplace UI in `src/app/dashboard/marketplace`.
- [x] **Moderation Queue UI**
    - [x] Create `/dashboard/admin/moderation` page.
    - [x] Fetch all posts (sort by reported/flagged first).
    - [x] Add "Takedown" and "Approve" actions.
- [x] **Takedown Logic**
    - [x] Implement `suspend_post` RPC function (set status='suspended').
    - [x] Update public middleware to block 'suspended' posts (return 404).
- [ ] **Automated Safety (Optional/Bonus)**
    - [ ] Integrate OpenAI Moderation API on `blog_post` insert/update.

## Dev Agent Record

### File List
- `src/components/marketplace/ServiceCard.tsx`
- `tests/components/marketplace/ServiceCard.test.tsx`
- `tests/components/ServiceCard.test.tsx`
- `supabase/migrations/20260117100000_add_blog_moderation.sql`
- `supabase/migrations/20260117120000_fix_blog_moderation.sql`
- `src/lib/moderation.ts`
- `src/components/admin/ModerationDashboard.tsx`
- `src/app/dashboard/admin/moderation/page.tsx`
- `src/app/api/admin/moderation/suspend/route.ts`
- `src/app/api/admin/moderation/restore/route.ts`
- `src/app/api/admin/moderation/approve/route.ts`
- `src/lib/email.ts`
- `src/lib/public-blog.ts`
- `tests/lib/moderation.test.ts`
- `tests/components/admin/ModerationDashboard.test.tsx`
- `tests/lib/public-blog.test.ts`
- `docs/story6.3.md`
- `docs/sprint-status.yaml`
- `tsconfig.json`
- `_bmad-output/traceability-matrix-story6.3.md`
- `_bmad-output/gate-decision-story6.3.md`
- `_bmad-output/implementation-readiness-report-2026-01-17.md`

### Implementation Plan
- Remove price displays from ServiceCard component (hotfix)
- Add 'suspended' status to blog_posts constraint via migration
- Create RPC functions for suspend/restore operations
- Build moderation library with admin-only functions
- Create ModerationDashboard component with Takedown/Restore actions
- Create admin moderation page at /dashboard/admin/moderation
- Write comprehensive tests for moderation functionality

### Completion Notes
- **Marketplace Hotfix**: Removed price badge from ServiceCard and changed "Buy ISBN - $125" to "Buy ISBN". Updated tests.
- **Moderation Queue UI**: Created admin moderation page showing all published/suspended posts with stats. Suspended posts shown first with red highlighting.
- **Takedown Logic**: Added 'suspended' status to blog_posts via migration. Created `suspend_blog_post`, `restore_suspended_blog_post`, and `approve_blog_post` RPC functions. Suspended posts 404 via public fetch guard.
- **Flagged Queue**: Added flagged metadata and queue ordering; flagged posts surfaced with Approve action.
- **Email Notification**: Admin takedown now sends author email via API route + Resend helper.
- **Automated Safety (Optional)**: Not implemented; pending OpenAI Moderation API integration.
- **Testing**: Updated tests for moderation library, moderation UI, and public blog guard.
- **Build Fix**: Added scripts folder to tsconfig.json exclude to fix pre-existing build error.
- Tests updated for moderation and public blog guard; `npm test` run after fixes (57/57 passed).

### Change Log
- **2026-01-16**: Added Marketplace Hotfix task per user request. Initialized moderation tasks.
- **2026-01-17**: Implemented Marketplace Hotfix - removed prices from ServiceCard.
- **2026-01-17**: Created moderation infrastructure: migration, RPC functions, moderation library.
- **2026-01-17**: Built ModerationDashboard component with Takedown/Restore functionality.
- **2026-01-17**: Created /dashboard/admin/moderation page for content moderation.
- **2026-01-17**: Added comprehensive tests (24 new tests). All tests pass.
- **2026-01-17**: Story complete, status set to review.
- **2026-01-17**: Fixed moderation RPC role checks, added flagged queue + approve action, and enabled takedown email notifications.
- **2026-01-17**: Status set to in-progress pending automated safety integration (optional).
- **2026-01-18**: Ran `npm test` after fixes; all 57 test suites passed.
- **2026-01-18**: Status set to done; automated safety remains optional and not implemented.

## Traceability
- **Matrix**: [traceability-matrix-story6.3.md](_bmad-output/traceability-matrix-story6.3.md)
- **Gate Decision**: [gate-decision-story6.3.md](_bmad-output/gate-decision-story6.3.md)
- **Status**: ⚠️ **CONCERNS**
- **Coverage**: 60% Overall (100% P0/P1)
- **Pass Rate**: 100%
- **Gaps**: Email notifications (P2), Automated Safety (P3/Optional).
