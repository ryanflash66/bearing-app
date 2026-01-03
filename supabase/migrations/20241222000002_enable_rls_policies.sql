-- Migration: Enable RLS and create policies
-- Story 1.3: Account & Role Management
-- Implements row-level security for all account-scoped tables
-- Note: All policies use DROP IF EXISTS for idempotency (AC 1.3.6)

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can read their own profile
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth_id = auth.uid());

-- Users can update their own profile (display_name, pen_name only - not role)
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- Users can insert their own profile (during signup)
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users for insert
  with check (auth_id = auth.uid());

-- Users can view other users in the same account (for collaboration features)
drop policy if exists "users_select_same_account" on public.users;
create policy "users_select_same_account"
  on public.users for select
  using (
    id in (
      select am.user_id 
      from public.account_members am
      where am.account_id in (select public.get_user_account_ids())
    )
  );

-- ============================================================================
-- ACCOUNTS TABLE POLICIES
-- ============================================================================

-- Members can view accounts they belong to
drop policy if exists "accounts_select_member" on public.accounts;
create policy "accounts_select_member"
  on public.accounts for select
  using (public.is_account_member(id));

-- Authenticated users can create new accounts
drop policy if exists "accounts_insert_authenticated" on public.accounts;
create policy "accounts_insert_authenticated"
  on public.accounts for insert
  with check (
    auth.uid() is not null
    and owner_user_id = public.get_current_user_id()
  );

-- Only account owner or admin can update account details
drop policy if exists "accounts_update_admin" on public.accounts;
create policy "accounts_update_admin"
  on public.accounts for update
  using (public.is_account_admin_or_owner(id))
  with check (public.is_account_admin_or_owner(id));

-- Only account owner can delete account
drop policy if exists "accounts_delete_owner" on public.accounts;
create policy "accounts_delete_owner"
  on public.accounts for delete
  using (
    owner_user_id in (
      select id from public.users where auth_id = auth.uid()
    )
  );

-- ============================================================================
-- ACCOUNT_MEMBERS TABLE POLICIES
-- ============================================================================

-- Members can view membership records for their accounts
drop policy if exists "members_select_same_account" on public.account_members;
create policy "members_select_same_account"
  on public.account_members for select
  using (public.is_account_member(account_id));

-- Account owner or admin can add new members
drop policy if exists "members_insert_admin" on public.account_members;
create policy "members_insert_admin"
  on public.account_members for insert
  with check (public.is_account_admin_or_owner(account_id));

-- Account owner or admin can update member roles
drop policy if exists "members_update_admin" on public.account_members;
create policy "members_update_admin"
  on public.account_members for update
  using (public.is_account_admin_or_owner(account_id))
  with check (public.is_account_admin_or_owner(account_id));

-- Account owner or admin can remove members
drop policy if exists "members_delete_admin" on public.account_members;
create policy "members_delete_admin"
  on public.account_members for delete
  using (public.is_account_admin_or_owner(account_id));

-- Users can add themselves to an account they created (during account creation)
drop policy if exists "members_insert_self_owner" on public.account_members;
create policy "members_insert_self_owner"
  on public.account_members for insert
  with check (
    user_id = public.get_current_user_id()
    and exists (
      select 1 from public.accounts a 
      where a.id = account_id 
        and a.owner_user_id = user_id
    )
  );

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- ============================================================================

-- Admins and support can view all audit logs for their account
drop policy if exists "audit_select_admin_support" on public.audit_logs;
create policy "audit_select_admin_support"
  on public.audit_logs for select
  using (public.is_account_support(account_id));

-- Authors can view their own audit events only
drop policy if exists "audit_select_own_events" on public.audit_logs;
create policy "audit_select_own_events"
  on public.audit_logs for select
  using (
    public.is_account_member(account_id)
    and user_id = public.get_current_user_id()
  );

-- Any member can insert audit logs for their account
-- (Insert is controlled by the application layer, not directly by users)
drop policy if exists "audit_insert_member" on public.audit_logs;
create policy "audit_insert_member"
  on public.audit_logs for insert
  with check (public.is_account_member(account_id));

-- No update or delete policies - audit logs are immutable
-- (Handled by triggers, but policies add defense in depth)

-- ============================================================================
-- SERVICE ROLE BYPASS
-- Note: service_role key bypasses RLS by default in Supabase
-- This is intentional for server-side operations
-- ============================================================================
