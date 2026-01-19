# Story 7.4: Coming Soon & Landing Pages

Status: ready-for-dev

<!-- Note: Comprehensive context generated via parallel-planning-workflow -->

## Story

As an Author,
I want a public "Coming Soon" landing page for my book,
So that I can collect email signups and build hype before launch.

## Acceptance Criteria

### 1. Public Landing Page
- [ ] Public route: `/book/[slug]` or `/author/[handle]/[book-slug]`.
- [ ] Displays: Cover Image (Hero), Title, Subtitle, Synopsis/Blurb.
- [ ] Displays: Author Bio & Photo (from Profile).
- [ ] "Get Notified" email capture form.

### 2. Email Capture
- [ ] User enters email -> saved to `book_signups` table.
- [ ] User receives "You're on the list!" confirmation email.
- [ ] Spam protection (Captcha or honeypot).

### 3. Author Customization
- [ ] Author can toggle page "Public" or "Private".
- [ ] Author can customize accent color or theme (Light/Dark).
- [ ] Author can view list of signups in Dashboard.

### 4. SEO & Social
- [ ] Page has correct Open Graph tags (Cover image, Title, Description).
- [ ] Fast loading (ISR or SSR recommended).

## Tasks / Subtasks

- [ ] 1. Database Schema
  - [ ] Create `book_signups` table (id, manuscript_id, email, created_at, source).
  - [ ] Add `slug` (unique), `is_public`, `theme_config` to `manuscripts` table.

- [ ] 2. Public Page Implementation
  - [ ] Create `src/app/book/[slug]/page.tsx` (Public layout).
  - [ ] Implement SEO metadata generation (Next.js Metadata API).
  - [ ] Design high-conversion "Hero" section.

- [ ] 3. Signup API
  - [ ] Create `POST /api/public/subscribe`.
  - [ ] Validate email, check limits, insert to DB.
  - [ ] Send transactional email (Resend/SendGrid) "Thanks for subscribing".

- [ ] 4. Dashboard View
  - [ ] Add "Marketing" tab to Manuscript Dashboard.
  - [ ] Show "List of Signups" (Export to CSV option).
  - [ ] Form to edit Slug and Public visibility.

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
Antigravity (Parallel Planner)

### Debug Log References
-

### Completion Notes List
-

### File List
-
