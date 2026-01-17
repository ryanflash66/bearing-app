-- Migration: Create increment_blog_post_views RPC function
-- PR Review Fix: Atomic view counter increment with proper access control
-- Story 6.1: Blog Management (CMS)

-- ============================================================================
-- RPC: increment_blog_post_views
-- Atomically increments the view count for a blog post
-- Uses SECURITY DEFINER to bypass RLS for this specific controlled operation
-- ============================================================================
create or replace function public.increment_blog_post_views(post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Atomically increment views_count
  -- COALESCE handles the edge case where views_count might be null
  update public.blog_posts
  set views_count = coalesce(views_count, 0) + 1
  where id = post_id
    and deleted_at is null;  -- Don't count views on deleted posts

  -- Note: We don't return anything or raise errors
  -- View counting is non-critical - silent failure is acceptable
end;
$$;

-- Grant execute to authenticated users so they can record their views
grant execute on function public.increment_blog_post_views(uuid) to authenticated;

-- Also grant to anon for public blog post views (logged-out readers)
grant execute on function public.increment_blog_post_views(uuid) to anon;

comment on function public.increment_blog_post_views is
  'Atomically increments the view count for a blog post. Uses SECURITY DEFINER to bypass RLS, allowing any authenticated user (or anon for public posts) to record a view without having UPDATE permission on the post itself.';

-- ============================================================================
-- RPC: increment_blog_post_reads
-- Similar function for tracking completed reads (scrolled to end)
-- ============================================================================
create or replace function public.increment_blog_post_reads(post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.blog_posts
  set reads_count = coalesce(reads_count, 0) + 1
  where id = post_id
    and deleted_at is null;
end;
$$;

grant execute on function public.increment_blog_post_reads(uuid) to authenticated;
grant execute on function public.increment_blog_post_reads(uuid) to anon;

comment on function public.increment_blog_post_reads is
  'Atomically increments the read count for a blog post (triggered when user scrolls to end). Uses SECURITY DEFINER to bypass RLS.';
