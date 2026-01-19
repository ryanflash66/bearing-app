-- Migration: Fix blog moderation roles + add flagged metadata
-- Story 6.3: Admin Blog Moderation (follow-up fixes)

-- ============================================================================
-- STEP 1: Add flagged metadata for moderation queue
-- ============================================================================

alter table public.blog_posts
  add column if not exists is_flagged boolean not null default false,
  add column if not exists flagged_at timestamptz,
  add column if not exists flag_reason text,
  add column if not exists flag_source text,
  add column if not exists flag_confidence numeric;

create index if not exists idx_blog_posts_flagged
  on public.blog_posts(flagged_at desc)
  where is_flagged = true;

-- ============================================================================
-- STEP 2: Fix suspend/restore RPCs (roles + correct user id mapping)
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
begin
  v_admin_id := public.get_current_user_id();

  if v_admin_id is null then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Load post and author email
  select bp.*, u.email as author_email
  into v_post
  from public.blog_posts bp
  join public.users u on u.id = bp.owner_user_id
  where bp.id = p_post_id
  and bp.deleted_at is null;

  if v_post is null then
    return json_build_object('success', false, 'error', 'Post not found');
  end if;

  if not (public.is_super_admin() or public.is_account_admin(v_post.account_id)) then
    return json_build_object('success', false, 'error', 'Admin access required');
  end if;

  if v_post.status = 'suspended' then
    return json_build_object('success', false, 'error', 'Post is already suspended');
  end if;

  update public.blog_posts
  set
    status = 'suspended',
    suspended_at = now(),
    suspended_by = v_admin_id,
    suspension_reason = p_reason,
    is_flagged = true,
    flagged_at = coalesce(flagged_at, now()),
    flag_reason = coalesce(flag_reason, p_reason),
    flag_source = coalesce(flag_source, 'admin')
  where id = p_post_id;

  return json_build_object(
    'success', true,
    'post_id', p_post_id,
    'author_email', v_post.author_email,
    'title', v_post.title
  );
end;
$$;

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
  v_admin_id := public.get_current_user_id();

  if v_admin_id is null then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;

  select * into v_post
  from public.blog_posts
  where id = p_post_id
  and deleted_at is null;

  if v_post is null then
    return json_build_object('success', false, 'error', 'Post not found');
  end if;

  if not (public.is_super_admin() or public.is_account_admin(v_post.account_id)) then
    return json_build_object('success', false, 'error', 'Admin access required');
  end if;

  if v_post.status != 'suspended' then
    return json_build_object('success', false, 'error', 'Post is not suspended');
  end if;

  update public.blog_posts
  set
    status = 'published',
    suspended_at = null,
    suspended_by = null,
    suspension_reason = null,
    is_flagged = false,
    flagged_at = null,
    flag_reason = null,
    flag_source = null,
    flag_confidence = null
  where id = p_post_id;

  return json_build_object(
    'success', true,
    'post_id', p_post_id
  );
end;
$$;

-- ============================================================================
-- STEP 3: Approve flagged post (clear flags without suspension)
-- ============================================================================

create or replace function public.approve_blog_post(
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
  v_admin_id := public.get_current_user_id();

  if v_admin_id is null then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;

  select * into v_post
  from public.blog_posts
  where id = p_post_id
  and deleted_at is null;

  if v_post is null then
    return json_build_object('success', false, 'error', 'Post not found');
  end if;

  if not (public.is_super_admin() or public.is_account_admin(v_post.account_id)) then
    return json_build_object('success', false, 'error', 'Admin access required');
  end if;

  if v_post.status = 'suspended' then
    return json_build_object('success', false, 'error', 'Post is suspended. Restore instead.');
  end if;

  update public.blog_posts
  set
    is_flagged = false,
    flagged_at = null,
    flag_reason = null,
    flag_source = null,
    flag_confidence = null
  where id = p_post_id;

  return json_build_object(
    'success', true,
    'post_id', p_post_id
  );
end;
$$;

-- ============================================================================
-- STEP 4: Fix moderation list RPC (roles + flagged posts)
-- ============================================================================

drop function if exists public.get_posts_for_moderation(int, int);

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
  is_flagged boolean,
  flagged_at timestamptz,
  flag_reason text,
  flag_source text,
  flag_confidence numeric,
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
  v_admin_id := public.get_current_user_id();

  if v_admin_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_super_admin() and not exists (
    select 1
    from public.account_members am
    where am.user_id = v_admin_id
    and am.account_role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

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
    bp.is_flagged,
    bp.flagged_at,
    bp.flag_reason,
    bp.flag_source,
    bp.flag_confidence,
    bp.created_at,
    u.id as author_id,
    u.email as author_email,
    u.display_name as author_display_name,
    u.pen_name as author_handle
  from public.blog_posts bp
  join public.users u on u.id = bp.owner_user_id
  where bp.deleted_at is null
    and (
      bp.status in ('published', 'suspended')
      or bp.is_flagged = true
    )
    and (
      public.is_super_admin()
      or public.is_account_admin(bp.account_id)
    )
  order by
    case when bp.is_flagged then 0 else 1 end,
    case when bp.status = 'suspended' then 0 else 1 end,
    bp.published_at desc nulls last
  limit p_limit
  offset p_offset;
end;
$$;

-- ============================================================================
-- STEP 5: Grant execute permissions
-- ============================================================================

grant execute on function public.suspend_blog_post(uuid, text) to authenticated;
grant execute on function public.restore_suspended_blog_post(uuid) to authenticated;
grant execute on function public.approve_blog_post(uuid) to authenticated;
grant execute on function public.get_posts_for_moderation(int, int) to authenticated;
