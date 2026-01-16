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
**Status:** review

## Tasks
- [x] **Infrastructure & Middleware**
    - [x] Update `middleware.ts` to allow specific public routes matching `/:handle/*`.
    - [x] Create `src/lib/public-api.ts` for privileged (admin-like) fetching of public data without user session.
- [x] **Public Profile Page (`/[handle]`)**
    - [x] Create `src/app/[handle]/page.tsx`.
    - [x] Fetch Author Profile by handle (Bio, Avatar).
    - [x] Fetch Published Books by AuthorID.
    - [x] Render responsive profile layout.
- [x] **Public Blog Index (`/[handle]/blog`)**
    - [x] Create `src/app/[handle]/blog/page.tsx`.
    - [x] Fetch published posts (paginated, 10 per page).
    - [x] Render `BlogCard` component list.
- [x] **Maintenance (Legacy)**
    - [x] Fix `DashboardLayout.test.tsx` to mock Supabase instead of Env Vars (or remove obsolete tests).
- [x] **Public Blog Post (`/[handle]/blog/[slug]`)**
    - [x] Create `src/app/[handle]/blog/[slug]/page.tsx`.
    - [x] Fetch single post by slug & author.
    - [x] Render content (using TipTap viewer or sanitized HTML).
    - [x] Implement `generateMetadata` for dynamic OpenGraph tags (Title, Description, Image).

## Dev Agent Record

### File List
- `src/utils/supabase/middleware.ts`
- `src/lib/public-api.ts`
- `src/lib/public-profile.ts`
- `src/app/[handle]/page.tsx`
- `src/lib/public-blog.ts`
- `src/components/blog/BlogCard.tsx`
- `src/components/blog/BlogPostViewer.tsx`
- `src/app/[handle]/blog/page.tsx`
- `src/app/[handle]/blog/[slug]/page.tsx`
- `tests/utils/middleware.test.ts`
- `tests/lib/public-api.test.ts`
- `tests/lib/public-profile.test.ts`
- `tests/lib/public-blog.test.ts`
- `tests/components/blog/BlogCard.test.tsx`
- `tests/components/layout/DashboardLayout.test.tsx`
- `.eslintrc.json`
- `.eslintignore`
- `package.json`
- `package-lock.json`

### Implementation Plan
- Add a public author route matcher in middleware to allow `/[handle]` and `/[handle]/blog` paths.
- Create a service-role public client helper for server-side public data access.
- Cover both with unit tests.
- Add public blog data access helpers and a `BlogCard` component for SSR list rendering.
- Maintenance re-validation: confirm Supabase mock usage in `DashboardLayout.test.tsx`; re-run targeted Jest and full suite; re-check lint.

### Completion Notes
- Added public author route detection for `/[handle]` and `/[handle]/blog` paths and covered with unit tests.
- Introduced `getPublicClient` helper for service-role public data access.
- Built the public author profile page with server-side data fetching and published book listing.
- Implemented public blog index page with pagination, `BlogCard` list, and public blog data helpers.
- Updated maintenance banner tests to use Supabase-driven state and mocked NotificationBell.
- Added public blog post page with SSR metadata, slug-based fetching, and a TipTap-based viewer.
- Full test suite passes (console warnings remain in unrelated tests).
- Established a repo-wide ESLint baseline so lint runs (warnings only); configured lint script and eslint config.
- Re-validated `DashboardLayout.test.tsx` Supabase mocking; targeted and full test suites pass.

### Change Log
- **2026-01-16**: Initial task list created for development.
- **2026-01-16**: Completed Infrastructure & Middleware task (public routes + public API helper).
- **2026-01-16**: Completed Public Profile Page (SSR profile + published books).
- **2026-01-16**: Completed Public Blog Index (pagination + BlogCard list).
- **2026-01-16**: Completed Maintenance (Legacy) test updates (Supabase mocks + NotificationBell stub).
- **2026-01-16**: Completed Public Blog Post (SSR metadata + viewer).
- **2026-01-16**: Revalidated Maintenance task and established ESLint baseline (lint runs with warnings).
