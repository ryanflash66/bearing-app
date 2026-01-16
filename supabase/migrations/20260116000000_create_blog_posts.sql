-- Migration: Create blog_posts table
-- Story 6.1: Blog Management (CMS)
-- Implements blog post storage for author content marketing

-- ============================================================================
-- BLOG_POSTS TABLE
-- Author blog posts for audience building and content marketing
-- ============================================================================
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete restrict,
  title text not null default 'Untitled Post',
  slug text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  content_json jsonb not null default '{}'::jsonb,    -- TipTap editor state
  content_text text not null default '',               -- Plaintext for search/AI
  excerpt text,                                        -- Preview text for listings
  word_count int not null default 0,                   -- Cached word count
  views_count int not null default 0,                  -- Total page views
  reads_count int not null default 0,                  -- Completed reads (scrolled to end)
  published_at timestamptz,                            -- When post was published
  deleted_at timestamptz,                              -- Soft delete timestamp
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Slug must be unique per account for clean URLs
  constraint blog_posts_account_slug_unique unique (account_id, slug)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for account lookups (active posts only)
create index if not exists idx_blog_posts_account_active
  on public.blog_posts(account_id)
  where deleted_at is null;

-- Index for owner lookups
create index if not exists idx_blog_posts_owner
  on public.blog_posts(owner_user_id);

-- Index for status filtering
create index if not exists idx_blog_posts_status
  on public.blog_posts(status);

-- Index for published posts (public queries)
create index if not exists idx_blog_posts_published
  on public.blog_posts(account_id, published_at desc)
  where status = 'published' and deleted_at is null;

-- Index for soft delete cleanup jobs
create index if not exists idx_blog_posts_deleted_at
  on public.blog_posts(deleted_at)
  where deleted_at is not null;

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.update_updated_at();

-- ============================================================================
-- TRIGGER: Auto-update word_count when content_text changes
-- ============================================================================
create or replace function public.update_blog_post_word_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only recalculate if content_text changed
  if new.content_text is distinct from old.content_text then
    new.word_count = public.calculate_word_count(new.content_text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_blog_posts_word_count on public.blog_posts;
create trigger trg_blog_posts_word_count
  before update on public.blog_posts
  for each row execute function public.update_blog_post_word_count();

-- Also calculate on insert
create or replace function public.set_blog_post_word_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.word_count = public.calculate_word_count(new.content_text);
  return new;
end;
$$;

drop trigger if exists trg_blog_posts_word_count_insert on public.blog_posts;
create trigger trg_blog_posts_word_count_insert
  before insert on public.blog_posts
  for each row execute function public.set_blog_post_word_count();

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
alter table public.blog_posts enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Members can view active blog posts in their account
drop policy if exists "blog_posts_select_member" on public.blog_posts;
create policy "blog_posts_select_member"
  on public.blog_posts for select
  using (
    public.is_account_member(account_id)
    and deleted_at is null
  );

-- Admins can view deleted blog posts (for recovery)
drop policy if exists "blog_posts_select_deleted_admin" on public.blog_posts;
create policy "blog_posts_select_deleted_admin"
  on public.blog_posts for select
  using (
    public.is_account_admin_or_owner(account_id)
    and deleted_at is not null
  );

-- Members can create blog posts in their account
drop policy if exists "blog_posts_insert_member" on public.blog_posts;
create policy "blog_posts_insert_member"
  on public.blog_posts for insert
  with check (
    public.is_account_member(account_id)
    and owner_user_id = public.get_current_user_id()
  );

-- Only owner or admin can update blog posts
drop policy if exists "blog_posts_update_owner_admin" on public.blog_posts;
create policy "blog_posts_update_owner_admin"
  on public.blog_posts for update
  using (
    owner_user_id = public.get_current_user_id()
    or public.is_account_admin(account_id)
  )
  with check (
    owner_user_id = public.get_current_user_id()
    or public.is_account_admin(account_id)
  );

-- No DELETE policy - use soft delete via deleted_at
-- This prevents accidental data loss

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
grant all on public.blog_posts to authenticated;
