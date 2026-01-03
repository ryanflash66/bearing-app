-- Migration: Create RLS helper functions
-- Story 1.3: Account & Role Management
-- These functions simplify RLS policy definitions

-- ============================================================================
-- HELPER FUNCTION: Get current user's internal ID from auth.uid()
-- ============================================================================
create or replace function public.get_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid()
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if current user is a member of an account
-- ============================================================================
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
      and u.auth_id = auth.uid()
  )
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if current user is an admin of an account
-- ============================================================================
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
      and u.auth_id = auth.uid()
      and am.account_role = 'admin'
  )
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if current user is an admin or owner of an account
-- ============================================================================
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
      and u.auth_id = auth.uid()
  )
  or public.is_account_admin(check_account_id)
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if current user has support role in an account
-- ============================================================================
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
      and u.auth_id = auth.uid()
      and am.account_role in ('support', 'admin')  -- admins can also access support functions
  )
$$;

-- ============================================================================
-- HELPER FUNCTION: Get all account IDs the current user is a member of
-- ============================================================================
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
  where u.auth_id = auth.uid()
$$;

-- Grant execute permissions
grant execute on function public.get_current_user_id() to authenticated;
grant execute on function public.is_account_member(uuid) to authenticated;
grant execute on function public.is_account_admin(uuid) to authenticated;
grant execute on function public.is_account_admin_or_owner(uuid) to authenticated;
grant execute on function public.is_account_support(uuid) to authenticated;
grant execute on function public.get_user_account_ids() to authenticated;

