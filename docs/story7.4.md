# Story 7.4: Coming Soon & Landing Pages

Status: done

<!-- Note: Comprehensive context generated via parallel-planning-workflow -->

## Story

As an Author,
I want a public "Coming Soon" landing page for my book,
So that I can collect email signups and build hype before launch.

## Acceptance Criteria

### 1. Public Landing Page
- [x] Public route: `/book/[slug]` or `/author/[handle]/[book-slug]`.
- [x] Displays: Cover Image (Hero), Title, Subtitle, Synopsis/Blurb.
- [x] Displays: Author Bio & Photo (from Profile).
- [x] "Get Notified" email capture form.

### 2. Email Capture
- [x] User enters email -> saved to `book_signups` table.
- [x] User receives "You're on the list!" confirmation email.
- [x] Spam protection (Captcha or honeypot).

### 3. Author Customization
- [x] Author can toggle page "Public" or "Private".
- [x] Author can customize accent color or theme (Light/Dark).
- [x] Author can view list of signups in Dashboard.

### 4. SEO & Social
- [x] Page has correct Open Graph tags (Cover image, Title, Description).
- [x] Fast loading (ISR or SSR recommended).

## Tasks / Subtasks

- [x] 1. Database Schema
  - [x] Create `book_signups` table (id, manuscript_id, email, created_at, source).
  - [x] Add `slug` (unique), `is_public`, `theme_config` to `manuscripts` table.

- [x] 2. Public Page Implementation
  - [x] Create `src/app/book/[slug]/page.tsx` (Public layout).
  - [x] Implement SEO metadata generation (Next.js Metadata API).
  - [x] Design high-conversion "Hero" section.

- [x] 3. Signup API
  - [x] Create `POST /api/public/subscribe`.
  - [x] Validate email, check limits, insert to DB.
  - [x] Send transactional email (Resend/SendGrid) "Thanks for subscribing".

- [x] 4. Dashboard View
  - [x] Add "Marketing" tab to Manuscript Dashboard.
  - [x] Show "List of Signups" (Export to CSV option).
  - [x] Form to edit Slug and Public visibility.

## Dev Notes

### Security
- Public page must NOT leak manuscript content (only synopsis/metadata).
- Rate limit the subscribe endpoint hard.

### Routing
- If we use `/book/[slug]`, ensure slug uniqueness globally. Or scoped to author: `/@penname/book-slug`. Scoped is safer for collisions. Let's start with `/@[handle]/[slug]` to match Story 6.3 Public Profile pattern.

### References
- [Story 6.2 Public Profile](docs/story6.2.md) (Reuse public layout components)

## Dev Agent Record

### Agent Model Used
Antigravity (Parallel Planner) + BMad (Code Reviewer)

### Debug Log References
-

### Completion Notes List
- Implemented Public Book Landing Page at `/[handle]/[slug]` with SSR caching and SEO metadata.
- Implemented `/api/public/subscribe` endpoint with DB storage, Honeypot spam protection, and rate limiting.
- Created `MarketingDashboard` component with public toggle, slug editing, theme customization (Light/Dark/Accent Color), and signups CSV export.
- Integrated Marketing Dashboard into Manuscript Dashboard via new sub-route.
- Added comprehensive tests for all new components and logic.
- **AI Review Fixes**: Added missing honeypot protection, rate limiting, and dashboard fields for subtitle/synopsis/theme.

### File List
- `src/app/[handle]/[slug]/page.tsx`
- `src/components/public/BookLandingPage.tsx`
- `src/lib/public-book.ts`
- `tests/lib/public-book.test.ts`
- `tests/components/public/BookLandingPage.test.tsx`
- `src/app/api/public/subscribe/route.ts`
- `tests/api/public-subscribe.test.ts`
- `src/components/marketing/MarketingDashboard.tsx`
- `tests/components/marketing/MarketingDashboard.test.tsx`
- `src/app/dashboard/manuscripts/[id]/marketing/page.tsx`
- `src/app/dashboard/manuscripts/[id]/page.tsx`
- `tests/migrations/coming-soon-schema.test.ts`