-- Migration: Coming Soon Landing Pages
-- Story 7.4: Coming Soon & Landing Pages
-- Creates book_signups table and adds slug/visibility fields to manuscripts

-- ============================================================================
-- ADD LANDING PAGE FIELDS TO MANUSCRIPTS
-- ============================================================================

-- Unique slug for public landing page URL (scoped to author handle: /@handle/[slug])
alter table public.manuscripts
add column if not exists slug text;

-- Toggle landing page visibility (false = private, true = public)
alter table public.manuscripts
add column if not exists is_public boolean not null default false;

-- Theme customization stored as JSON
-- { "accent_color": "#HEX", "theme": "light" | "dark" }
alter table public.manuscripts
add column if not exists theme_config jsonb not null default '{"theme": "light"}'::jsonb;

-- Synopsis/blurb for landing page display (separate from full content)
alter table public.manuscripts
add column if not exists synopsis text;

-- Subtitle for landing page hero section
alter table public.manuscripts
add column if not exists subtitle text;

-- Cover image URL for hero display
alter table public.manuscripts
add column if not exists cover_image_url text;

-- Unique slug within the same owner (author) - prevents URL collisions
create unique index if not exists idx_manuscripts_owner_slug
on public.manuscripts(owner_user_id, slug)
where slug is not null and deleted_at is null;

comment on column public.manuscripts.slug is 'URL-friendly identifier for public landing page';
comment on column public.manuscripts.is_public is 'Whether the landing page is visible to the public';
comment on column public.manuscripts.theme_config is 'JSON config for landing page theming: { theme: light|dark, accent_color: #HEX }';
comment on column public.manuscripts.synopsis is 'Short description/blurb for landing page';
comment on column public.manuscripts.subtitle is 'Book subtitle displayed on landing page';
comment on column public.manuscripts.cover_image_url is 'URL to cover image for landing page hero';

-- ============================================================================
-- BOOK SIGNUPS TABLE
-- Stores email signups for "Coming Soon" notifications
-- ============================================================================

create table if not exists public.book_signups (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  email text not null,
  source text default 'landing_page', -- where signup came from (landing_page, widget, etc.)
  created_at timestamptz not null default now()
);

-- Prevent duplicate signups for the same book
create unique index if not exists idx_book_signups_manuscript_email
on public.book_signups(manuscript_id, email);

-- Index for counting signups by manuscript
create index if not exists idx_book_signups_manuscript
on public.book_signups(manuscript_id);

comment on table public.book_signups is 'Email signups for book launch notifications';
comment on column public.book_signups.manuscript_id is 'The book being subscribed to';
comment on column public.book_signups.email is 'Subscriber email address';
comment on column public.book_signups.source is 'Source of the signup (landing_page, widget, etc.)';

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

alter table public.book_signups enable row level security;

-- ============================================================================
-- RLS POLICIES FOR BOOK_SIGNUPS
-- ============================================================================

-- Public insert policy for anonymous/authenticated users subscribing
drop policy if exists "book_signups_insert_public" on public.book_signups;
create policy "book_signups_insert_public"
on public.book_signups for insert
with check (
  -- Verify manuscript is public
  exists (
    select 1 from public.manuscripts m
    where m.id = manuscript_id
    and m.is_public = true
    and m.deleted_at is null
  )
);

-- Manuscript owners can view their signups
drop policy if exists "book_signups_select_owner" on public.book_signups;
create policy "book_signups_select_owner"
on public.book_signups for select
using (
  exists (
    select 1 from public.manuscripts m
    where m.id = manuscript_id
    and m.owner_user_id = public.get_current_user_id()
  )
);

-- Manuscript owners can delete signups (e.g., unsubscribe requests)
drop policy if exists "book_signups_delete_owner" on public.book_signups;
create policy "book_signups_delete_owner"
on public.book_signups for delete
using (
  exists (
    select 1 from public.manuscripts m
    where m.id = manuscript_id
    and m.owner_user_id = public.get_current_user_id()
  )
);

-- Grant permissions
grant select, insert, delete on public.book_signups to authenticated;
grant insert on public.book_signups to anon;

-- ============================================================================
-- PUBLIC ACCESS POLICY FOR LANDING PAGES
-- Allow anonymous users to read public manuscript metadata
-- ============================================================================

-- Create separate policy for public manuscript viewing (landing pages)
drop policy if exists "manuscripts_select_public" on public.manuscripts;
create policy "manuscripts_select_public"
on public.manuscripts for select
using (
  is_public = true
  and deleted_at is null
);
