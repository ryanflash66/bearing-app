# Story 7.1: Beta Reader Access & Commenting

Status: done

<!-- Note: Comprehensive context generated via validate-create-story simulation -->

## Story

As an Author,
I want to securely invite beta readers to view my manuscript and leave comments,
So that I can gather feedback and improve my story before publication.

## Acceptance Criteria

### 1. Secure Invite System
- [ ] Author can generate a unique, token-based invite link for a specific manuscript.
- [ ] Author can set an expiration date for the link (default: 30 days).
- [ ] Author can revoke a link at any time, instantly removing access.
- [ ] Link allows "Read Only" or "Read & Comment" permissions.
- [ ] DB schema supports `beta_access_tokens` with secure RLS.

### 2. Beta Reader View (Reader Mode)
- [ ] Beta Readers accessing the link (`/beta/[token]`) see a simplified "Reader Mode" interface.
- [ ] Interface strips all editing tools (read-only).
- [ ] Supports basic reading preferences (font size, light/dark mode).
- [ ] Access is validated strictly via the URL token (no account creation REQUIRED).
- [ ] **Constraint:** If commenting is allowed, Reader MUST provide a display name before viewing.

### 3. Inline Commenting
- [ ] Reader can highlight text and add a comment.
- [ ] Comments support categories: "General Feedback", "Typo/Grammar".
- [ ] Comments are persisted to `beta_comments` table.
- [ ] Author sees beta reader comments in their main Editor interface.
- [ ] Author can "Resolve" comments.

### 4. Security & Performance
- [ ] RLS policies strictly prevent beta readers from editing anything.
- [ ] RLS policies prevent beta readers from viewing other manuscripts.
- [ ] Rate limiting on beta endpoints to prevent scraping.

## Tasks / Subtasks

- [x] 1. Database Schema for Beta Access
  - [x] Create `beta_access_tokens` table (id, manuscript_id, token, expires_at, permissions, created_by).
  - [x] Create `beta_comments` table (id, manuscript_id, chapter_id, selected_text, comment_text, author_name, type, status).
  - [x] Enable RLS on both tables.
  - [x] Create RLS policies: Author can manage tokens/comments; Anon with token can read manuscript (via function) and create comments.
  - [x] Create secure Postgres function `verify_beta_token(token)` to authorize access without direct RLS bypass if needed.

- [x] 2. Beta Access API & Management UI
  - [x] Implement TRPC/NextJS endpoint to `createInviteLink(manuscriptId, options)`.
  - [x] Implement endpoint to `revokeInviteLink(tokenId)`.
  - [x] UI: "Share / Beta" modal in Author Dashboard.
  - [x] UI: List active links with Revoke button.

- [x] 3. Beta Reader Page (Reader Mode)
  - [x] Create new route `/beta/[token]`.
  - [x] Implement server-side token validation (redirect to 404/expired if invalid).
  - [x] Fetch manuscript content (Chapters) securely (Read-Only).
  - [x] Implement "Enter Name" gatescreen if commenting is enabled.
  - [x] Build simplified `ReaderLayout` (no sidebar tools, focus on text).

- [x] 4. Beta Commenting Logic
  - [x] Implement text highlighting for Guest users.
  - [x] Build "Add Comment" popover for Beta view.
  - [x] Implement API `postBetaComment(token, chapterId, text, selection)`.
  - [x] Verify RLS/Permissions on post.

- [x] 5. Author Comment Review
  - [x] Update Editor to fetch and overlay `beta_comments`.
  - [x] Differentiate beta comments from AI/Editor comments visually.
  - [x] Implement "Resolve" action for Author.

- [x] 6. End-to-End Verification
  - [x] Verify Invite flows (Generate -> Open in Incognito -> Read).
  - [x] Verify Revoke stops access immediately.
  - [x] Verify Comment submission and appearance in Author view.
  - [x] Security test: Try to access without token or with expired token.

## Dev Notes

### Architecture & Security
- **Supabase RLS**: Critical. Beta readers are effectively "anonymous" to Supabase Auth (or a special 'beta' role if we use custom claims).
  - *Recommendation*: Use a Postgres function `get_beta_manuscript(token)` to strictly control data access, rather than exposing `manuscripts` table to public/anon.
  - *Alternatively*: If using RLS on `manuscripts`, be VERY CAREFUL opening it to `anon`. Secure token approach is preferred.
- **Next.js**: Use Middleware for token validation if possible, or Server Components.

### References
- [Epic 7 Definitions](docs/sprint-status.yaml) (Backlog reference)
- [PRD 13 Security](docs/PRD.md#13-security-requirements)
- Existing Comment System (Epic 2/3) - try to reuse `comments` table schema or align with it. (Decision: using `beta_comments` separate table to avoid pollution and complex RLS on main `comments` table is safer).

## Dev Agent Record

### Agent Model Used
Antigravity (simulating SM Validate-Create-Story)

### Debug Log References
- Implementation Plan: add beta_access_tokens/beta_comments tables with RLS, token verification function, and a migration schema test.
- Implementation Plan: ship beta invite APIs, reader mode UI, comment workflows, and author review surface with rate limiting.

### Completion Notes List
- ✅ Added beta_access_tokens and beta_comments tables with RLS policies and token-based manuscript access.
- ✅ Implemented verify_beta_token function and grants for anon/auth access.
- ✅ Built beta invite APIs and Share/Beta modal with active-link management.
- ✅ Added /beta/[token] reader mode with font/theme controls and display-name gating.
- ✅ Implemented guest comment flow with selection popover and comment API + rate limit.
- ✅ Added author-facing beta comments panel with resolve action.
- ✅ Added tests for migrations, invites, reader gating, beta comments API, and comment panel.
- ✅ Ran full jest suite and lint (lint warnings only).

### File List
- supabase/migrations/20260119000000_add_beta_reader_access.sql
- src/app/api/beta/comments/route.ts
- src/app/api/manuscripts/[id]/beta-invites/route.ts
- src/app/api/manuscripts/[id]/beta-invites/[tokenId]/route.ts
- src/app/beta/[token]/BetaReaderClient.tsx
- src/app/beta/[token]/page.tsx
- src/components/manuscripts/BetaCommentsPanel.tsx
- src/components/manuscripts/BetaShareModal.tsx
- src/components/manuscripts/ManuscriptEditor.tsx
- src/lib/beta-rate-limit.ts
- tests/api/beta-comments.test.ts
- tests/api/beta-invites.test.ts
- tests/beta/beta-reader.test.tsx
- tests/components/manuscripts/BetaCommentsPanel.test.tsx
- tests/migrations/beta-access-schema.test.ts
- docs/sprint-status.yaml

### Change Log
- 2026-01-19: Implemented beta reader access (schema, APIs, reader mode, comments, author review, tests).
