# Story 9.1: Admin User Manuscript Viewing

Status: backlog
Renumbered from: 8.14 (moved to Epic 9: Admin Expansion & Platform Polish)

Dependencies: Story 5.6.3 (R2 Manuscript Storage Migration) - MUST be completed first

## Story

As a **Super Admin / Admin / Support Agent**,
I want **to view a user's manuscripts in read-only mode**,
so that **I can troubleshoot issues, review flagged content, and assist users with support requests without needing direct database access**.

## Background / Current State

- There is no admin-facing manuscript viewing capability
- Support agents handling tickets have no way to see the manuscript a user is referencing
- Super admins manage users via `/dashboard/admin/super/users` but cannot inspect their content
- Admin-aware Supabase client pattern exists (`getAdminAwareClient()` from `src/lib/supabase-admin.ts`)
- Manuscripts currently stored in Supabase `content_text` column
- **After Story 5.6.3**: Manuscripts will be stored in Cloudflare R2 (no RLS - access control at API layer)

### Why This Depends on Story 5.6.3

Manuscript storage is migrating from Supabase to R2. Building this feature against Supabase `content_text` would require a full refactor once R2 migration completes. Implementing after 5.6.3 ensures:
- Built correctly against R2 from day one
- No wasted work or throwaway code
- API-layer access control designed for R2 (which has no native RLS)

If this story is urgently needed before 5.6.3, it CAN be built against Supabase with the understanding that Task 4.1 in Story 5.6.3 will require updating the read paths.

## Acceptance Criteria

1. **Role Access**: Super admins, admins, and support agents can view manuscripts belonging to users within their access scope. Super admins can view any manuscript across the platform. Admins can view manuscripts belonging to members of their account. Support agents can view manuscripts referenced in support tickets assigned to them. [AC 8.14.1]

2. **Read-Only View**: Manuscripts are displayed in a read-only rendered view (not raw HTML/text). Reuse the existing TipTap editor component in read-only mode. No editing, saving, or exporting capabilities for admin viewers. [AC 8.14.2]

3. **Entry Points**: Admin viewers can access manuscripts from:
   - Super admin user management page (`/dashboard/admin/super/users`) - "View Manuscripts" action per user
   - Support ticket detail page (`/dashboard/support/[id]`) - link to referenced manuscript
   - Direct URL: `/dashboard/admin/manuscripts/[manuscriptId]` [AC 8.14.3]

4. **Manuscript List**: When viewing a user's manuscripts, display a list with: title, word count, last updated date, status. Clicking a manuscript opens the read-only view. [AC 8.14.4]

5. **Audit Logging**: Every admin manuscript view is logged to the audit trail with: viewer user ID, viewer role, manuscript ID, manuscript owner ID, timestamp, and access reason (if from support ticket, include ticket ID). [AC 8.14.5]

6. **Access Control (R2-Aware)**: Manuscript content is fetched through the existing manuscript read API with admin-aware access checks. After Story 5.6.3, this means API-layer authorization (not RLS) verifying the requesting user has admin/super_admin/support_agent role with appropriate scope. [AC 8.14.6]

7. **No Content Modification**: Admin viewers cannot modify manuscript content, metadata, or settings. The UI must not expose any save, edit, or delete controls. [AC 8.14.7]

8. **Performance**: Manuscript viewing must load within 3 seconds for manuscripts up to 100k words. [AC 8.14.8]

## Tasks / Subtasks

- [ ] **Task 1: API Layer**
  - [ ] 1.1: Create `GET /api/admin/manuscripts/[manuscriptId]` - admin read-only endpoint
  - [ ] 1.2: Implement role-based access checks (super_admin: any, admin: account scope, support_agent: ticket scope)
  - [ ] 1.3: Create `GET /api/admin/users/[userId]/manuscripts` - list user's manuscripts
  - [ ] 1.4: Read from R2 (post-5.6.3) or Supabase (pre-5.6.3) based on feature flag

- [ ] **Task 2: Audit Logging**
  - [ ] 2.1: Log manuscript view events to audit trail
  - [ ] 2.2: Include access context (direct, from user management, from support ticket)

- [ ] **Task 3: UI - Manuscript List**
  - [ ] 3.1: Create `AdminManuscriptList` component (title, word count, updated, status)
  - [ ] 3.2: Add "View Manuscripts" action to super admin user management table
  - [ ] 3.3: Create `/dashboard/admin/manuscripts/user/[userId]` page

- [ ] **Task 4: UI - Read-Only Viewer**
  - [ ] 4.1: Create `/dashboard/admin/manuscripts/[manuscriptId]` page
  - [ ] 4.2: Reuse TipTap editor in read-only mode (`editable: false`)
  - [ ] 4.3: Display manuscript metadata header (title, author, word count, last updated)
  - [ ] 4.4: Add "Back to user" navigation breadcrumb

- [ ] **Task 5: Support Ticket Integration**
  - [ ] 5.1: Add manuscript link to support ticket detail page (if ticket references a manuscript)
  - [ ] 5.2: Support agent scope check: verify ticket is assigned to viewing agent

- [ ] **Task 6: Testing**
  - [ ] 6.1: Unit tests for role-based access control logic
  - [ ] 6.2: Integration test: super admin can view any manuscript
  - [ ] 6.3: Integration test: admin can only view account-scoped manuscripts
  - [ ] 6.4: Integration test: support agent can only view ticket-referenced manuscripts
  - [ ] 6.5: Verify audit log entries are created
  - [ ] 6.6: Verify no edit/save/delete controls are exposed

## Dev Notes

- Reuse `getAdminAwareClient()` pattern from `src/lib/supabase-admin.ts` for Supabase queries
- TipTap editor supports `editable: false` prop for read-only rendering - no need for a separate viewer component
- After Story 5.6.3, R2 has no RLS. All access control MUST be enforced at the API route level. Double-check that admin routes verify role before fetching from R2.
- Consider adding a "reason for viewing" text field that support agents must fill in before viewing (compliance/privacy consideration). This is optional for MVP.
- Images embedded in manuscripts (Story 8.8) must also render correctly in the admin read-only view via the existing image proxy route

## References

- Story 5.6.3: R2 Manuscript Storage Migration (dependency)
- Story 4.1: Admin role architecture
- Story 4.5: Super admin dashboard
- Story 4.4: Support agent dashboard
- `src/lib/supabase-admin.ts`: Admin-aware client pattern
- `src/app/dashboard/admin/super/users/page.tsx`: User management page (entry point)
- `src/app/dashboard/support/[id]/page.tsx`: Support ticket detail (entry point)

---

### Change Log

- 2026-02-10: Created story doc. Flagged dependency on Story 5.6.3 (R2 migration)
