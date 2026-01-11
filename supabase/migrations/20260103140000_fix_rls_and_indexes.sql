-- Migration: Fix RLS Performance and Add Missing Indexes
-- Story 5.0 (Tech Debt): Address Supabase Warnings & Fix "Account Required" Error

-- ============================================================================
-- 1. FIX AUTH FUNCTION PERFORMANCE (Supabase Warning: auth_rls_initplan)
-- Wrap auth.uid() and auth.jwt() in (select ...) to prevent re-evaluation per row
-- ============================================================================

-- Fix get_current_user_id to use cached auth.uid()
create or replace function public.get_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = (select auth.uid())
$$;

-- Fix is_account_member
create or replace function public.is_account_member(check_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 
    from public.account_members am
    join public.users u on u.id = am.user_id
    where am.account_id = check_account_id
      and u.auth_id = (select auth.uid())
  )
$$;

-- Fix is_account_admin
create or replace function public.is_account_admin(check_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 
    from public.account_members am
    join public.users u on u.id = am.user_id
    where am.account_id = check_account_id
      and u.auth_id = (select auth.uid())
      and am.account_role = 'admin'
  )
$$;

-- Fix is_account_admin_or_owner
create or replace function public.is_account_admin_or_owner(check_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 
    from public.accounts a
    join public.users u on u.id = a.owner_user_id
    where a.id = check_account_id
      and u.auth_id = (select auth.uid())
  )
  or public.is_account_admin(check_account_id)
$$;

-- Fix is_account_support
create or replace function public.is_account_support(check_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 
    from public.account_members am
    join public.users u on u.id = am.user_id
    where am.account_id = check_account_id
      and u.auth_id = (select auth.uid())
      and am.account_role in ('support', 'admin')
  )
$$;

-- Fix get_user_account_ids
create or replace function public.get_user_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select am.account_id
  from public.account_members am
  join public.users u on u.id = am.user_id
  where u.auth_id = (select auth.uid())
$$;

-- ============================================================================
-- 2. UPDATE POLICIES FOR PERFORMANCE AND ROBUSTNESS
-- ============================================================================

-- USERS TABLE
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth_id = (select auth.uid()));

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth_id = (select auth.uid()))
  with check (auth_id = (select auth.uid()));

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users for insert
  with check (auth_id = (select auth.uid()));

-- ACCOUNTS TABLE
-- Fix: accounts_insert_authenticated (Was potentially flaky or slow)
drop policy if exists "accounts_insert_authenticated" on public.accounts;
create policy "accounts_insert_authenticated"
  on public.accounts for insert
  with check (
    (select auth.uid()) is not null
    and owner_user_id = public.get_current_user_id()
  );

-- Fix: accounts_delete_owner
drop policy if exists "accounts_delete_owner" on public.accounts;
create policy "accounts_delete_owner"
  on public.accounts for delete
  using (
    owner_user_id in (
      select id from public.users where auth_id = (select auth.uid())
    )
  );

-- ACCOUNT_MEMBERS TABLE
-- No direct auth.uid() calls in policies (they use wrappers), but wrappers are now optimized.

-- ============================================================================
-- 3. ADD MISSING INDEXES (Supabase Suggestion: unindexed_foreign_keys)
-- ============================================================================

create index if not exists idx_ai_usage_events_user_id 
  on public.ai_usage_events(user_id);

create index if not exists idx_manuscript_versions_created_by 
  on public.manuscript_versions(created_by);

create index if not exists idx_support_messages_sender_user_id 
  on public.support_messages(sender_user_id);
