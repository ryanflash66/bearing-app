# Story 6.1: Blog Management (CMS)

Status: ready-for-dev

## Story

As an **Author**,
I want a dashboard to create, edit, and publish blog posts,
so that I can build an audience and share updates about my writing journey.

## Acceptance Criteria

1. **AC1: Blog Dashboard Access**
   - **Given** an authenticated Author on the dashboard
   - **When** they navigate to "Marketing > Blog"
   - **Then** they see a list view of all their blog posts with status (Draft/Published) and metrics (views/reads)

2. **AC2: Create New Post**
   - **Given** the Blog dashboard
   - **When** the Author clicks "New Post"
   - **Then** they are redirected to an editor page with fields for Title, Slug, and Content (TipTap rich-text editor)

3. **AC3: Save Draft**
   - **Given** a blog post being edited
   - **When** the Author clicks "Save Draft" or content autosaves
   - **Then** the post is saved with status "draft" and is not visible publicly

4. **AC4: Publish Post**
   - **Given** a draft blog post
   - **When** the Author clicks "Publish"
   - **Then** the post status changes to "published" and `published_at` timestamp is set
   - **And** the post will be visible at `/[pen_name]/blog/[slug]` (public rendering in Story 6.2)

5. **AC5: Edit Published Post**
   - **Given** a published blog post
   - **When** the Author edits and saves
   - **Then** changes are reflected immediately on the public page

6. **AC6: Unpublish/Archive Post**
   - **Given** a published blog post
   - **When** the Author clicks "Unpublish" or "Archive"
   - **Then** the post is no longer visible publicly but remains accessible in the dashboard

7. **AC7: View Metrics**
   - **Given** the Blog dashboard list view
   - **Then** each post displays: title, status badge, view count, read count, created date, updated date

## Tasks / Subtasks

### Database Layer
- [ ] Task 1: Create blog_posts migration (AC: 1-7)
  - [ ] 1.1: Create `blog_posts` table with columns: id, account_id, owner_user_id, title, slug, status, content_json, content_text, excerpt, views_count, reads_count, published_at, deleted_at, created_at, updated_at
  - [ ] 1.2: Add CHECK constraint for status: 'draft', 'published', 'archived'
  - [ ] 1.3: Add UNIQUE constraint on (account_id, slug) for URL uniqueness
  - [ ] 1.4: Create indexes: account_id (active posts), status, published_at
  - [ ] 1.5: Add auto-update trigger for updated_at timestamp

- [ ] Task 2: Create RLS policies for blog_posts (AC: 1-7)
  - [ ] 2.1: SELECT policy - account members can view their posts (active and deleted)
  - [ ] 2.2: INSERT policy - account members can create posts in their account
  - [ ] 2.3: UPDATE policy - only owner or account admin can update
  - [ ] 2.4: No DELETE policy (use soft delete via deleted_at)

### API Layer
- [ ] Task 3: Create blog posts API routes (AC: 2-6)
  - [ ] 3.1: POST `/api/blog/posts` - Create new blog post with generated slug
  - [ ] 3.2: GET `/api/blog/posts` - List all posts for current account with status/metrics
  - [ ] 3.3: GET `/api/blog/posts/[id]` - Get single post for editing
  - [ ] 3.4: PATCH `/api/blog/posts/[id]` - Update post (autosave support with conflict detection)
  - [ ] 3.5: POST `/api/blog/posts/[id]/publish` - Change status to published, set published_at
  - [ ] 3.6: POST `/api/blog/posts/[id]/unpublish` - Change status back to draft
  - [ ] 3.7: POST `/api/blog/posts/[id]/archive` - Soft delete (set deleted_at)

### Dashboard UI
- [ ] Task 4: Create Blog dashboard page (AC: 1, 7)
  - [ ] 4.1: Create `/dashboard/marketing/blog/page.tsx` server component
  - [ ] 4.2: Create `BlogPostList` client component with status badges and metrics
  - [ ] 4.3: Add "New Post" button linking to `/dashboard/marketing/blog/new`
  - [ ] 4.4: Display posts sorted by updated_at DESC
  - [ ] 4.5: Add delete confirmation modal with soft-delete action

- [ ] Task 5: Create Blog editor page (AC: 2-5)
  - [ ] 5.1: Create `/dashboard/marketing/blog/new/page.tsx` - creates post and redirects
  - [ ] 5.2: Create `/dashboard/marketing/blog/[id]/page.tsx` - editor page
  - [ ] 5.3: Create `BlogPostEditor` component with Title, Slug, and TipTap editor
  - [ ] 5.4: Integrate existing `TiptapEditor` component for content editing
  - [ ] 5.5: Implement autosave using `useAutosave` hook pattern
  - [ ] 5.6: Add "Save Draft", "Publish", "Unpublish" action buttons
  - [ ] 5.7: Add slug auto-generation from title with manual override option

- [ ] Task 6: Add navigation to Blog dashboard (AC: 1)
  - [ ] 6.1: Add "Marketing" section to dashboard sidebar navigation
  - [ ] 6.2: Add "Blog" link under Marketing section

### Testing
- [ ] Task 7: Write tests for blog functionality (AC: 1-7)
  - [ ] 7.1: Unit tests for slug generation utility
  - [ ] 7.2: API route tests for CRUD operations
  - [ ] 7.3: RLS policy tests for access control
  - [ ] 7.4: Component tests for BlogPostList and BlogPostEditor

## Dev Notes

### Architecture Compliance
- **Frontend**: Next.js App Router with server components for data fetching, client components for interactivity
- **Database**: Supabase PostgreSQL with RLS for account isolation
- **Editor**: Reuse existing TipTap implementation from manuscript editor (`src/components/editor/TiptapEditor.tsx`)
- **Autosave**: Follow pattern from `src/lib/useAutosave.ts` with conflict detection

### Technical Requirements
- Store content in dual format: `content_json` (TipTap state) + `content_text` (plaintext for search/AI)
- Slug must be unique per account, auto-generated from title, URL-safe (lowercase, hyphens)
- Status lifecycle: draft → published ↔ draft, published → archived
- Soft delete pattern: set `deleted_at` timestamp, filter in queries

### Key Libraries & Versions
- TipTap Editor: Already installed from Epic 2 (StarterKit extension)
- Supabase Client: Use `createClient()` from `src/lib/supabase.ts`
- For admin operations: Use `getAdminAwareClient()` from `src/lib/supabase-admin.ts`

### File Structure Requirements
```
src/
├── app/
│   ├── api/blog/
│   │   └── posts/
│   │       ├── route.ts              # POST (create), GET (list)
│   │       └── [id]/
│   │           ├── route.ts          # GET (single), PATCH (update)
│   │           ├── publish/route.ts  # POST (publish)
│   │           ├── unpublish/route.ts # POST (unpublish)
│   │           └── archive/route.ts  # POST (soft delete)
│   └── dashboard/
│       └── marketing/
│           └── blog/
│               ├── page.tsx          # Blog list dashboard
│               ├── new/page.tsx      # Create redirect
│               └── [id]/page.tsx     # Editor page
├── components/
│   └── blog/
│       ├── BlogPostList.tsx          # List with status/metrics
│       └── BlogPostEditor.tsx        # Editor wrapper component
├── lib/
│   └── blog.ts                       # Database helper functions
└── types/
    └── blog.ts                       # TypeScript interfaces
supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_create_blog_posts.sql
```

### Database Schema
```sql
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL DEFAULT 'Untitled Post',
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_text TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  reads_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, slug)
);
```

### Testing Standards
- Unit tests with Vitest for utility functions
- API tests mocking Supabase client
- RLS tests using real database with test users
- Component tests with React Testing Library

### Project Structure Notes
- Dashboard pages follow existing pattern: server component fetches data, passes to client component
- API routes follow REST conventions with proper error handling
- Use existing status badge styling from manuscripts (`bg-slate-100 text-slate-700` for draft, `bg-emerald-100 text-emerald-700` for published)

### References
- [Source: docs/architecture.md#1.1] TipTap for editor, TanStack Query for caching
- [Source: docs/architecture-database.md] RLS policy patterns and immutable audit logs
- [Source: src/components/editor/TiptapEditor.tsx] Existing TipTap implementation
- [Source: src/lib/useAutosave.ts] Autosave with offline support pattern
- [Source: src/app/dashboard/manuscripts/page.tsx] Dashboard list page pattern
- [Source: src/components/manuscripts/ManuscriptList.tsx] List component pattern
- [Source: project-context.md] Next.js 15+ async params requirement

### Critical Implementation Notes
1. **Next.js 15+ Async Params**: Always await route params: `const { id } = await params;`
2. **Supabase Ambiguous FKs**: If joining users table, specify FK constraint name
3. **Content Dual Storage**: Always save both JSON and plaintext versions
4. **Slug Validation**: Check uniqueness before save, handle conflicts gracefully

## Dev Agent Record

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References


### Completion Notes List


### File List


## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Story created with comprehensive context | create-story workflow |
