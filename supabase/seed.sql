-- Seed Script for Local Development
-- Story 1.3: Account & Role Management
-- Creates test users, accounts, and memberships for development and testing

-- ============================================================================
-- IMPORTANT: This seed script should only be run in local development
-- It creates test users with predictable IDs for testing purposes
-- ============================================================================

-- Note: In Supabase, auth.users are managed separately
-- This seed assumes test auth users are created via Supabase Dashboard or CLI
-- The seed creates the corresponding application users, accounts, and memberships

-- ============================================================================
-- TEST USER AUTH IDs (these would be created via Supabase Auth first)
-- In local dev, you can create users via the Supabase Studio UI
-- ============================================================================
-- Test User 1 (Alice - Admin): auth_id will be set after auth user creation
-- Test User 2 (Bob - Author): auth_id will be set after auth user creation
-- Test User 3 (Carol - Support): auth_id will be set after auth user creation

-- ============================================================================
-- FUNCTION: Create test data (call after auth users exist)
-- ============================================================================
create or replace function public.seed_test_data(
  alice_auth_id uuid,
  bob_auth_id uuid,
  carol_auth_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  alice_user_id uuid;
  bob_user_id uuid;
  carol_user_id uuid;
  acme_account_id uuid;
  writers_account_id uuid;
begin
  -- Create test users
  insert into public.users (id, auth_id, email, display_name, pen_name, role)
  values 
    (gen_random_uuid(), alice_auth_id, 'alice@example.com', 'Alice Admin', 'A.A. Writer', 'admin')
  returning id into alice_user_id;

  insert into public.users (id, auth_id, email, display_name, pen_name, role)
  values 
    (gen_random_uuid(), bob_auth_id, 'bob@example.com', 'Bob Author', 'B.B. Novelist', 'author')
  returning id into bob_user_id;

  insert into public.users (id, auth_id, email, display_name, pen_name, role)
  values 
    (gen_random_uuid(), carol_auth_id, 'carol@example.com', 'Carol Support', null, 'support')
  returning id into carol_user_id;

  -- Create test accounts
  insert into public.accounts (id, name, owner_user_id)
  values 
    (gen_random_uuid(), 'ACME Publishing', alice_user_id)
  returning id into acme_account_id;

  insert into public.accounts (id, name, owner_user_id)
  values 
    (gen_random_uuid(), 'Independent Writers', bob_user_id)
  returning id into writers_account_id;

  -- Create account memberships
  -- Alice is admin of ACME Publishing (her account)
  insert into public.account_members (account_id, user_id, account_role)
  values (acme_account_id, alice_user_id, 'admin');

  -- Bob is author in ACME Publishing
  insert into public.account_members (account_id, user_id, account_role)
  values (acme_account_id, bob_user_id, 'author');

  -- Carol is support in ACME Publishing
  insert into public.account_members (account_id, user_id, account_role)
  values (acme_account_id, carol_user_id, 'support');

  -- Bob is admin of Independent Writers (his account)
  insert into public.account_members (account_id, user_id, account_role)
  values (writers_account_id, bob_user_id, 'admin');

  -- Create some audit log entries for testing
  insert into public.audit_logs (account_id, user_id, action, entity_type, entity_id, metadata)
  values 
    (acme_account_id, alice_user_id, 'account_created', 'account', acme_account_id, '{"name": "ACME Publishing"}'::jsonb),
    (acme_account_id, alice_user_id, 'user_invited', 'user', bob_user_id, '{"role": "author", "email": "bob@example.com"}'::jsonb),
    (acme_account_id, alice_user_id, 'user_invited', 'user', carol_user_id, '{"role": "support", "email": "carol@example.com"}'::jsonb),
    (writers_account_id, bob_user_id, 'account_created', 'account', writers_account_id, '{"name": "Independent Writers"}'::jsonb);

  raise notice 'Test data seeded successfully!';
  raise notice 'Alice (admin) user_id: %', alice_user_id;
  raise notice 'Bob (author) user_id: %', bob_user_id;
  raise notice 'Carol (support) user_id: %', carol_user_id;
  raise notice 'ACME Publishing account_id: %', acme_account_id;
  raise notice 'Independent Writers account_id: %', writers_account_id;
end;
$$;

-- ============================================================================
-- USAGE:
-- After creating auth users in Supabase Studio, run:
-- select public.seed_test_data(
--   'alice-auth-uuid-here'::uuid,
--   'bob-auth-uuid-here'::uuid,
--   'carol-auth-uuid-here'::uuid
-- );
-- ============================================================================

comment on function public.seed_test_data is 'Seeds test users, accounts, and memberships for local development. Call after creating auth users.';

