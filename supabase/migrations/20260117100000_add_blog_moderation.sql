-- Migration: Add blog moderation features
-- Story 6.3: Admin Blog Moderation
-- Adds 'suspended' status and moderation functions

-- ============================================================================
-- STEP 1: Add 'suspended' to status constraint
-- ============================================================================

-- Drop old constraint and add new one with 'suspended'
alter table public.blog_posts
  drop constraint if exists blog_posts_status_check;

alter table public.blog_posts
  add constraint blog_posts_status_check
  check (status in ('draft', 'published', 'archived', 'suspended'));

-- ============================================================================
-- STEP 2: Add moderation tracking columns
-- ============================================================================

-- Add column for tracking suspension reason (if not exists)
alter table public.blog_posts
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.users(id),
  add column if not exists suspension_reason text;

-- ============================================================================
-- STEP 3: Index for moderation queries
-- ============================================================================

-- Index for finding suspended posts
create index if not exists idx_blog_posts_suspended
  on public.blog_posts(suspended_at desc)
  where status = 'suspended';

-- ============================================================================
-- STEP 4: RPC function to suspend a post (admin only)
-- ============================================================================

create or replace function public.suspend_blog_post(
  p_post_id uuid,
  p_reason text default 'Content policy violation'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_post record;
  v_author_email text;
begin
  -- Get current user
  v_admin_id := auth.uid();

  if v_admin_id is null then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Check if user is admin or super_admin
  if not exists (
    select 1 from public.users
    where id = v_admin_id
    and role in ('admin', 'super_admin')
  ) then
    return json_build_object('success', false, 'error', 'Admin access required');
  end if;

  -- Get post and verify it exists and is published
  select bp.*, u.email as author_email
  into v_post
  from public.blog_posts bp
  join public.users u on u.id = bp.owner_user_id
  where bp.id = p_post_id
  and bp.deleted_at is null;

  if v_post is null then
    return json_build_object('success', false, 'error', 'Post not found');
  end if;

  if v_post.status = 'suspended' then
    return json_build_object('success', false, 'error', 'Post is already suspended');
  end if;

  -- Suspend the post
  update public.blog_posts
  set
    status = 'suspended',
    suspended_at = now(),
    suspended_by = v_admin_id,
    suspension_reason = p_reason
  where id = p_post_id;

  return json_build_object(
    'success', true,
    'post_id', p_post_id,
    'author_email', v_post.author_email,
    'title', v_post.title
  );
end;
$$;

-- ============================================================================
-- STEP 5: RPC function to restore a suspended post (admin only)
-- ============================================================================

create or replace function public.restore_suspended_blog_post(
  p_post_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_post record;
begin
  -- Get current user
  v_admin_id := auth.uid();

  if v_admin_id is null then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Check if user is admin or super_admin
  if not exists (
    select 1 from public.users
    where id = v_admin_id
    and role in ('admin', 'super_admin')
  ) then
    return json_build_object('success', false, 'error', 'Admin access required');
  end if;

  -- Get post and verify it's suspended
  select * into v_post
  from public.blog_posts
  where id = p_post_id
  and deleted_at is null;

  if v_post is null then
    return json_build_object('success', false, 'error', 'Post not found');
  end if;

  if v_post.status != 'suspended' then
    return json_build_object('success', false, 'error', 'Post is not suspended');
  end if;

  -- Restore the post to published status
  update public.blog_posts
  set
    status = 'published',
    suspended_at = null,
    suspended_by = null,
    suspension_reason = null
  where id = p_post_id;

  return json_build_object(
    'success', true,
    'post_id', p_post_id
  );
end;
$$;

-- ============================================================================
-- STEP 6: RPC function to get posts for moderation (admin only)
-- ============================================================================

create or replace function public.get_posts_for_moderation(
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  slug text,
  status text,
  excerpt text,
  word_count int,
  views_count int,
  published_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz,
  author_id uuid,
  author_email text,
  author_display_name text,
  author_handle text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
begin
  -- Get current user
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check if user is admin or super_admin
  if not exists (
    select 1 from public.users
    where users.id = v_admin_id
    and role in ('admin', 'super_admin')
  ) then
    raise exception 'Admin access required';
  end if;

  -- Return posts for moderation
  -- Order: suspended first, then published by date
  return query
  select
    bp.id,
    bp.title,
    bp.slug,
    bp.status,
    bp.excerpt,
    bp.word_count,
    bp.views_count,
    bp.published_at,
    bp.suspended_at,
    bp.suspension_reason,
    bp.created_at,
    u.id as author_id,
    u.email as author_email,
    u.display_name as author_display_name,
    u.handle as author_handle
  from public.blog_posts bp
  join public.users u on u.id = bp.owner_user_id
  where bp.deleted_at is null
  and bp.status in ('published', 'suspended')
  order by
    case when bp.status = 'suspended' then 0 else 1 end,
    bp.published_at desc nulls last
  limit p_limit
  offset p_offset;
end;
$$;

-- Grant execute permissions
grant execute on function public.suspend_blog_post(uuid, text) to authenticated;
grant execute on function public.restore_suspended_blog_post(uuid) to authenticated;
grant execute on function public.get_posts_for_moderation(int, int) to authenticated;
