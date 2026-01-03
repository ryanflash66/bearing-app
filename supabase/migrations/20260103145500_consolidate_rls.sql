-- Migration: Consolidate RLS Policies
-- Address 'multiple_permissive_policies' warnings by combining policies for the same role/action.

-- 1. Consolidate Users SELECT
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_select_same_account" on public.users;

-- Combined policy: Users can see themselves OR other members of their accounts
create policy "users_select_combined" on public.users for select using (
  auth_id = (select auth.uid())
  or
  id in (
    select am.user_id
    from public.account_members am
    where am.account_id in (select public.get_user_account_ids())
  )
);

-- 2. Consolidate Account Members INSERT
drop policy if exists "members_insert_admin" on public.account_members;
drop policy if exists "members_insert_self_owner" on public.account_members;

-- Combined policy: Admins can add members OR users can add themselves during account creation
create policy "members_insert_combined" on public.account_members for insert with check (
  public.is_account_admin_or_owner(account_id)
  or
  (
    user_id = public.get_current_user_id()
    and exists (
      select 1 from public.accounts a
      where a.id = account_id
      and a.owner_user_id = user_id
    )
  )
);

-- 3. Consolidate Audit Logs SELECT
drop policy if exists "audit_select_admin_support" on public.audit_logs;
drop policy if exists "audit_select_own_events" on public.audit_logs;

-- Combined policy: Support/Admins can see all logs OR users can see their own events
create policy "audit_select_combined" on public.audit_logs for select using (
  public.is_account_support(account_id)
  or
  (
    public.is_account_member(account_id)
    and user_id = public.get_current_user_id()
  )
);

-- 4. Consolidate Billing Cycles SELECT
-- Note: "billing_cycles_all_admin" was FOR ALL, causing a clash with "billing_cycles_select_member" on SELECT.
-- We split it into explicit INSERT/UPDATE/DELETE policies to avoid the SELECT clash.

drop policy if exists "billing_cycles_all_admin" on public.billing_cycles;
drop policy if exists "billing_cycles_select_member" on public.billing_cycles;

-- Combined SELECT: Members (which includes admins) can view cycles
create policy "billing_cycles_select_combined" on public.billing_cycles for select using (
  public.is_account_member(account_id)
  or public.is_account_admin_or_owner(account_id)
);

-- Split Write Policies for Admin/Owner
create policy "billing_cycles_insert_admin" on public.billing_cycles for insert with check (
  public.is_account_admin_or_owner(account_id)
);

create policy "billing_cycles_update_admin" on public.billing_cycles for update using (
  public.is_account_admin_or_owner(account_id)
) with check (
  public.is_account_admin_or_owner(account_id)
);

create policy "billing_cycles_delete_admin" on public.billing_cycles for delete using (
  public.is_account_admin_or_owner(account_id)
);

-- 5. Consolidate Manuscripts SELECT
drop policy if exists "manuscripts_select_member" on public.manuscripts;
drop policy if exists "manuscripts_select_deleted_admin" on public.manuscripts;

-- Combined policy: Members see active docs OR Admins see deleted docs
create policy "manuscripts_select_combined" on public.manuscripts for select using (
  (
    public.is_account_member(account_id)
    and deleted_at is null
  )
  or
  (
    public.is_account_admin_or_owner(account_id)
    and deleted_at is not null
  )
);
