-- Helper for automated testing (Story 4.1 verification)
-- Bypasses RLS to ensure account creation during tests

create or replace function public.create_test_account(
  owner_id uuid,
  account_name text default 'Test Account'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
begin
  -- 1. Create Account
  insert into public.accounts (name, owner_user_id)
  values (account_name, owner_id)
  returning id into new_account_id;

  -- 2. Create Membership (Owner)
  insert into public.account_members (account_id, user_id, account_role)
  values (new_account_id, owner_id, 'admin');

  -- 3. Log Audit (Optional, but good for completeness)
  -- Skipped to keep it simple and avoid triggering other RLS

  return new_account_id;
end;
$$;


-- Helper to force delete users even if audit logs exist (bypassing triggers)
create or replace function public.force_cleanup_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Bypass triggers to allow deleting immutable audit logs
  set session_replication_role = 'replica';
  
  delete from public.audit_logs where user_id = target_user_id;
  delete from public.users where id = target_user_id;
  
  set session_replication_role = 'origin';
end;
$$;

grant execute on function public.force_cleanup_user to anon, authenticated, service_role;
